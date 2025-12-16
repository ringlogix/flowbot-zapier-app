import { INodeType, INodeTypeDescription, IExecuteFunctions } from 'n8n-workflow';
import { CONFIG } from '../shared/config';

export class CallTransferAction implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Call Transfer',
        name: 'callTransfer',
        group: ['transform'],
        version: 1,
        description: 'Transfer the call to another destination.',
        defaults: { name: 'Call Transfer' },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [{ name: 'flowbotApi', required: true }],
        properties: [
            {
                displayName: 'Call ID',
                name: 'call_id',
                type: 'string',
                required: true,
                default: '',
                description: 'Call ID value from your trigger output.',
            },
            {
                displayName: 'Destination',
                name: 'destination',
                type: 'string',
                required: true,
                default: '',
                description: 'Destination to transfer the call to.',
            },
        ],
    };

    async execute(this: IExecuteFunctions) {
        const items = this.getInputData();
        const returnData = [];

        for (let i = 0; i < items.length; i++) {
            const callId = this.getNodeParameter('call_id', i) as string;
            const destination = this.getNodeParameter('destination', i) as string;
            const credentials = await this.getCredentials('flowbotApi');
            const response = await this.helpers.request({
                method: 'POST',
                url: `${CONFIG.BASE_URL}/actions/call_transfer`,
                headers: {
                    'X-API-KEY': credentials?.apiKey,
                    Accept: 'application/json',
                    'Flowbot-SourceIntegrationType': CONFIG.SOURCE_TYPE,
                },
                body: {
                    call_id: callId,
                    destination,
                },
                json: true,
            });

            returnData.push({ json: { success: true, call_id: callId, destination, response } });
        }
        return this.prepareOutputData(returnData);
    }
}