import { ICommonObject, IFileUpload, IMultiModalOption, INodeData, MessageContentImageUrl } from './Interface'
import path from 'path'
import { getStoragePath } from './utils'
import fs from 'fs'
import { ChatOpenAI } from '../nodes/chatmodels/ChatOpenAI/FlowiseChatOpenAI'
import { LLMChain } from 'langchain/chains'
import { RunnableBinding, RunnableSequence } from 'langchain/schema/runnable'
import { AgentExecutor as LcAgentExecutor, ChatAgent, RunnableAgent } from 'langchain/agents'
import { AgentExecutor } from './agents'

export interface MultiModalOptions {
    nodeOptions: ICommonObject
}

export const injectLLMChainNodeData = (nodeData: INodeData, options: ICommonObject) => {
    let llmChain = nodeData.instance as LLMChain
    ;(llmChain.llm as ChatOpenAI).lc_kwargs.chainData = { nodeOptions: getUploadsFromOptions(options) }
}

export const injectAgentExecutorNodeData = (agentExecutor: AgentExecutor, nodeData: INodeData, options: ICommonObject) => {
    if (agentExecutor.agent instanceof RunnableAgent && agentExecutor.agent.runnable instanceof RunnableSequence) {
        let rs = agentExecutor.agent.runnable as RunnableSequence
        injectRunnableNodeData(rs, nodeData, options)
    }
}

export const injectLcAgentExecutorNodeData = (agentExecutor: LcAgentExecutor, nodeData: INodeData, options: ICommonObject) => {
    if (agentExecutor.agent instanceof ChatAgent) {
        let llmChain = agentExecutor.agent.llmChain as LLMChain
        ;(llmChain.llm as ChatOpenAI).lc_kwargs.chainData = { nodeOptions: getUploadsFromOptions(options) }
    }
}

export const injectRunnableNodeData = (runnableSequence: RunnableSequence, nodeData: INodeData, options: ICommonObject) => {
    runnableSequence.steps.forEach((step) => {
        if (step instanceof ChatOpenAI) {
            ;(step as ChatOpenAI).lc_kwargs.chainData = { nodeOptions: getUploadsFromOptions(options) }
        }

        if (step instanceof RunnableBinding) {
            if ((step as RunnableBinding<any, any>).bound instanceof ChatOpenAI) {
                ;((step as RunnableBinding<any, any>).bound as ChatOpenAI).lc_kwargs.chainData = {
                    nodeOptions: getUploadsFromOptions(options)
                }
            }
        }
    })
}

const getUploadsFromOptions = (options: ICommonObject): ICommonObject => {
    if (options?.uploads) {
        return {
            uploads: options.uploads,
            chatflowid: options.chatflowid,
            chatId: options.chatId
        }
    }
    return {}
}

export const addImagesToMessages = (options: ICommonObject, multiModalOption?: IMultiModalOption): MessageContentImageUrl[] => {
    const imageContent: MessageContentImageUrl[] = []

    // Image Uploaded
    if (multiModalOption?.image && multiModalOption?.image.allowImageUploads && options?.uploads && options?.uploads.length > 0) {
        const imageUploads = getImageUploads(options.uploads)
        for (const upload of imageUploads) {
            if (upload.type == 'stored-file') {
                const filePath = path.join(getStoragePath(), options.chatflowid, options.chatId, upload.name)

                // as the image is stored in the server, read the file and convert it to base64
                const contents = fs.readFileSync(filePath)
                let bf = 'data:' + upload.mime + ';base64,' + contents.toString('base64')

                imageContent.push({
                    type: 'image_url',
                    image_url: {
                        url: bf,
                        detail: multiModalOption?.image.imageResolution ?? 'low'
                    }
                })
            }
        }
    }
    return imageContent
}

export const getAudioUploads = (uploads: IFileUpload[]) => {
    return uploads.filter((upload: IFileUpload) => upload.mime.startsWith('audio/'))
}

export const getImageUploads = (uploads: IFileUpload[]) => {
    return uploads.filter((upload: IFileUpload) => upload.mime.startsWith('image/'))
}
