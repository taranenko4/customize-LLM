import { ICommonObject, INode, INodeData, INodeParams, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src'
import { DynamoDBChatMessageHistory } from 'langchain/stores/message/dynamodb'
import { BufferMemory } from 'langchain/memory'

class DynamoDb_Memory implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'DynamoDB Chat Memory'
        this.name = 'DynamoDBChatMemory'
        this.type = 'DynamoDBChatMemory'
        this.icon = 'dynamodb.svg'
        this.category = 'Memory'
        this.description = 'Stores the conversation in dynamo db table'
        this.baseClasses = [this.type, ...getBaseClasses(BufferMemory)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['dynamodbMemoryApi']
        }
        this.inputs = [
            {
                label: 'Table Name',
                name: 'tableName',
                type: 'string'
            },
            {
                label: 'Partition Key',
                name: 'partitionKey',
                type: 'string'
            },
            {
                label: 'Region',
                name: 'region',
                type: 'string',
                description: 'The aws region in which table is located',
                placeholder: 'us-east-1'
            },
            {
                label: 'Session ID',
                name: 'sessionId',
                type: 'string',
                description: 'if empty, chatId will be used automatically',
                default: '',
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
        const tableName = nodeData.inputs?.tableName as string
        const partitionKey = nodeData.inputs?.partitionKey as string
        const sessionId = nodeData.inputs?.sessionId as string
        const region = nodeData.inputs?.region as string
        const memoryKey = nodeData.inputs?.memoryKey as string

        const chatId = options.chatId

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessKey = getCredentialParam('accessKey', credentialData, nodeData)
        const secretAccessKey = getCredentialParam('secretAccessKey', credentialData, nodeData)

        const dynamoDb = new DynamoDBChatMessageHistory({
            tableName,
            partitionKey,
            sessionId: sessionId ? sessionId : chatId,
            config: {
                region,
                credentials: {
                    accessKeyId: accessKey,
                    secretAccessKey
                }
            }
        })

        const memory = new BufferMemory({
            memoryKey,
            chatHistory: dynamoDb,
            returnMessages: true
        })
        return memory
    }
}

module.exports = { nodeClass: DynamoDb_Memory }
