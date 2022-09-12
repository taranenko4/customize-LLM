import { INode, INodeData, INodeOutputsValue, INodeParams, INodeOptionsValue } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { getBaseClasses } from '../../../src/utils'
import { ConnectionOptions, SingleStoreVectorStore, SingleStoreVectorStoreConfig } from 'langchain/vectorstores/singlestore'
import { flatten } from 'lodash'
import { integer } from '@opensearch-project/opensearch/api/types'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'

class SingleStoreUpsert_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'SingleStore Upsert Document'
        this.name = 'singlestoreUpsert'
        this.type = 'SingleStore'
        this.icon = 'singlestore.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to SingleStore'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Host',
                name: 'host',
                type: 'string'
            },
            {
                label: 'Port',
                name: 'port',
                type: 'string'
            },
            {
                label: 'User',
                name: 'user',
                type: 'string'
            },
            {
                label: 'Password',
                name: 'password',
                type: 'password'
            },
            {
                label: 'Database',
                name: 'database',
                type: 'string'
            },
            {
                label: 'Table Name',
                name: 'tableName',
                type: 'string'
            },
            {
                label: 'Content Column Name',
                name: 'contentColumnName',
                type: 'string'
            },
            {
                label: 'Vector Column Name',
                name: 'vectorColumnName',
                type: 'string'
            },
            {
                label: 'Metadata Column Name',
                name: 'metadataColumnName',
                type: 'string'
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'SingleStore Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'SingleStore Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(SingleStoreVectorStore)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const singleStoreConnectionConfig = {
            connectionOptions: {
                host: nodeData.inputs?.host as string,
                port: nodeData.inputs?.port as integer,
                user: nodeData.inputs?.user as string,
                password: nodeData.inputs?.password as string,
                database: nodeData.inputs?.database as string
            },
            tableName: nodeData.inputs?.tableName as string,
            contentColumnName: nodeData.inputs?.contentColumnName as string,
            vectorColumnName: nodeData.inputs?.vectorColumnName as string,
            metadataColumnName: nodeData.inputs?.metadataColumnName as string
        } as SingleStoreVectorStoreConfig

        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseInt(topK, 10) : 4

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        let vectorStore: SingleStoreVectorStore | MemoryVectorStore
        
        vectorStore = new SingleStoreVectorStore(embeddings, singleStoreConnectionConfig)
        vectorStore.addDocuments.bind(vectorStore)(finalDocs)
        

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: SingleStoreUpsert_VectorStores }
