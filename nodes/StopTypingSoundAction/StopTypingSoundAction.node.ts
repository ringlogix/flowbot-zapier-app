import { INodeType, INodeTypeDescription, IExecuteFunctions } from 'n8n-workflow';
import { CONFIG } from '../../shared/config';

export class StopTypingSound implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Start Typing Sound',
    name: 'startTypingSound',
    group: ['transform'],
    version: 1,
    description: 'Start the typing sound for the agent during an active call.',
    defaults: { name: 'Start Typing Sound' },
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
    ],
  };

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const returnData = [];

    for (let i = 0; i < items.length; i++) {
      const callId = this.getNodeParameter('call_id', i) as string;
      const credentials = await this.getCredentials('flowbotApi');
      const response = await this.helpers.request({
        method: 'POST',
        url: `${CONFIG.BASE_URL}/actions/stop_typing_sound`,
        headers: {
          'X-API-KEY': credentials?.apiKey,
          Accept: 'application/json',
          'Flowbot-SourceIntegrationType': CONFIG.SOURCE_TYPE,
        },
        body: { call_id: callId },
        json: true,
      });
      returnData.push({ json: { success: true, call_id: callId, response } });
    }
    return [returnData];
  }
}