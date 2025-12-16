import type {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties
} from 'n8n-workflow';
import { CONFIG } from '../shared/config';

export class FlowbotApi implements ICredentialType {
    name = 'flowbotApi';
    displayName = 'Flowbot';
    documentationUrl = '';
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
        },
    ];
    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'X-Api-Key': '={{$credentials.apiKey}}',
                'Flowbot-SourceIntegrationType': CONFIG.SOURCE_TYPE,
            },
        },
    };
    test: ICredentialTestRequest = {
        request: {
            baseURL: CONFIG.BASE_URL,
            url: '/get-agents',
        },
    };
}