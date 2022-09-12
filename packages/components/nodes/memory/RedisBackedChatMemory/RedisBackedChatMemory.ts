import { Redis } from 'ioredis'
import { BufferMemory, BufferMemoryInput } from 'langchain/memory'
import { RedisChatMessageHistory, RedisChatMessageHistoryInput } from 'langchain/stores/message/ioredis'
import { mapStoredMessageToChatMessage, BaseMessage, AIMessage, HumanMessage } from 'langchain/schema'
import { INode, INodeData, INodeParams, ICommonObject, MessageType, IMessage } from '../../../src/Interface'
import { convertBaseMessagetoIMessage, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class RedisBackedChatMemory_Memory implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Redis-Backed Chat Memory'
        this.name = 'RedisBackedChatMemory'
        this.version = 2.0
        this.type = 'RedisBackedChatMemory'
        this.icon = 'redis.svg'
        this.category = 'Memory'
        this.description = 'Summarizes the conversation and stores the memory in Redis server'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['redisCacheApi', 'redisCacheUrlApi']
        }
        this.inputs = [
            {
                label: 'Session Id',
                name: 'sessionId',
                type: 'string',
                description:
                    'If not specified, a random id will be used. Learn <a target="_blank" href="https://docs.flowiseai.com/memory/long-term-memory#ui-and-embedded-chat">more</a>',
                default: '',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Session Timeouts',
                name: 'sessionTTL',
                type: 'number',
                description: 'Omit this parameter to make sessions never expire',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Memory Key',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return await initalizeRedis(nodeData, options)
    }
}

const initalizeRedis = async (nodeData: INodeData, options: ICommonObject): Promise<BufferMemory> => {
    const sessionTTL = nodeData.inputs?.sessionTTL as number
    const memoryKey = nodeData.inputs?.memoryKey as string
    const chatId = options?.chatId as string

    let isSessionIdUsingChatMessageId = false
    let sessionId = ''

    if (!nodeData.inputs?.sessionId && chatId) {
        isSessionIdUsingChatMessageId = true
        sessionId = chatId
    } else {
        sessionId = nodeData.inputs?.sessionId
    }

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const redisUrl = getCredentialParam('redisUrl', credentialData, nodeData)

    let client: Redis

    if (!redisUrl || redisUrl === '') {
        const username = getCredentialParam('redisCacheUser', credentialData, nodeData)
        const password = getCredentialParam('redisCachePwd', credentialData, nodeData)
        const portStr = getCredentialParam('redisCachePort', credentialData, nodeData)
        const host = getCredentialParam('redisCacheHost', credentialData, nodeData)

        client = new Redis({
            port: portStr ? parseInt(portStr) : 6379,
            host,
            username,
            password
        })
    } else {
        client = new Redis(redisUrl)
    }

    let obj: RedisChatMessageHistoryInput = {
        sessionId,
        client
    }

    if (sessionTTL) {
        obj = {
            ...obj,
            sessionTTL
        }
    }

    const redisChatMessageHistory = new RedisChatMessageHistory(obj)

    /**** Methods below are needed to override the original implementations ****/
    redisChatMessageHistory.getMessages = async (): Promise<BaseMessage[]> => {
        const rawStoredMessages = await client.lrange((redisChatMessageHistory as any).sessionId, 0, -1)
        const orderedMessages = rawStoredMessages.reverse().map((message) => JSON.parse(message))
        return orderedMessages.map(mapStoredMessageToChatMessage)
    }

    redisChatMessageHistory.addMessage = async (message: BaseMessage): Promise<void> => {
        const messageToAdd = [message].map((msg) => msg.toDict())
        await client.lpush((redisChatMessageHistory as any).sessionId, JSON.stringify(messageToAdd[0]))
        if (sessionTTL) {
            await client.expire((redisChatMessageHistory as any).sessionId, sessionTTL)
        }
    }

    redisChatMessageHistory.clear = async (): Promise<void> => {
        await client.del((redisChatMessageHistory as any).sessionId)
    }
    /**** End of override functions ****/

    const memory = new BufferMemoryExtended({
        memoryKey: memoryKey ?? 'chat_history',
        chatHistory: redisChatMessageHistory,
        isSessionIdUsingChatMessageId,
        sessionId,
        redisClient: client
    })

    return memory
}

interface BufferMemoryExtendedInput {
    isSessionIdUsingChatMessageId: boolean
    redisClient: Redis
    sessionId: string
}

class BufferMemoryExtended extends BufferMemory {
    isSessionIdUsingChatMessageId = false
    sessionId = ''
    redisClient: Redis

    constructor(fields: BufferMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.isSessionIdUsingChatMessageId = fields.isSessionIdUsingChatMessageId
        this.sessionId = fields.sessionId
        this.redisClient = fields.redisClient
    }

    async getChatMessages(overrideSessionId = ''): Promise<IMessage[]> {
        if (!this.redisClient) return []

        const id = overrideSessionId ?? this.sessionId
        const rawStoredMessages = await this.redisClient.lrange(id, 0, -1)
        const orderedMessages = rawStoredMessages.reverse().map((message) => JSON.parse(message))
        const baseMessages = orderedMessages.map(mapStoredMessageToChatMessage)
        return convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        if (!this.redisClient) return

        const id = overrideSessionId ?? this.sessionId
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')

        if (input) {
            const newInputMessage = new HumanMessage(input.text)
            const messageToAdd = [newInputMessage].map((msg) => msg.toDict())
            await this.redisClient.lpush(id, JSON.stringify(messageToAdd[0]))
        }

        if (output) {
            const newOutputMessage = new AIMessage(output.text)
            const messageToAdd = [newOutputMessage].map((msg) => msg.toDict())
            await this.redisClient.lpush(id, JSON.stringify(messageToAdd[0]))
        }
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        if (!this.redisClient) return

        const id = overrideSessionId ?? this.sessionId
        await this.redisClient.del(id)
        await this.clear()
    }
}

module.exports = { nodeClass: RedisBackedChatMemory_Memory }
