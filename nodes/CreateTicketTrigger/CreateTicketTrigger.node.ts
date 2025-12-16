import {
  INodeType,
  INodeTypeDescription,
  ILoadOptionsFunctions,
  IHookFunctions,
  IWebhookFunctions,
  IWebhookResponseData,
} from 'n8n-workflow';
import { FlowbotClient } from '../../shared/FlowbotClient';
import { CONFIG } from '../../shared/config';

export class CreateTicketTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: `${CONFIG.COMPANY_NAME} Create Ticket Trigger`,
    name: 'createTicketTrigger',
    group: ['trigger'],
    version: 1,
    description: 'Triggers from ${CONFIG.COMPANY_NAME}.',
    defaults: {
      name: `${CONFIG.COMPANY_NAME} Create Ticket`,
    },
    codex: {
      categories: ['Productivity'],
      subcategories: { Productivity: ['${CONFIG.COMPANY_NAME}'] },
      alias: ['${CONFIG.COMPANY_NAME}'],
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'flowbotApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Agent(s)',
        name: 'flowbot_agent',
        type: 'multiOptions',
        required: true,
        typeOptions: {
          loadOptionsMethod: 'getAgents',
        },
        default: [],
        description: 'Select one or more ${CONFIG.COMPANY_NAME} agents to filter events.',
      },
      {
        displayName: 'Tool Name',
        name: 'tool_name',
        type: 'string',
        required: true,
        default: 'create_tool',
        description: 'Custom name for this tool. Used for identification in ${CONFIG.COMPANY_NAME} backend.',
      }
    ],
  };

  methods = {
    loadOptions: {
      async getAgents(this: ILoadOptionsFunctions) {
        const credentials = await this.getCredentials('flowbotApi');
        const apiKey = credentials.apiKey as string;
        return FlowbotClient.getAgents(this, { apiKey });
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    // Get request headers and body
    const headers = this.getHeaderData();
    const body = this.getBodyData();

    // Try to find the integration header in various casings
    const headerValue =
      headers['integration-header'] ||
      headers['Integration-Header'] ||
      headers['INTEGRATION-HEADER'] ||
      headers['http-integration-header'] ||
      headers['Http-Integration-Header'] ||
      headers['http-INTEGRATION-HEADER'];

    if (!headerValue) {
      throw new Error('Missing authentication header');
    }

    if (headerValue === 'TEST_MODE') {
      // Return the body as workflow data for test headers
      return {
        workflowData: [[{ json: body }]],
      };
    }

    const staticData = this.getWorkflowStaticData('node');
    console.log('Static Data:', staticData);

    // Verify the header with Flowbot API
    const credentials = await this.getCredentials('flowbotApi');
    const client = new FlowbotClient(this, { apiKey: credentials.apiKey as string });

    const verifyUrl = '/verify-hook';
    try {
      await client.request({
        url: verifyUrl,
        method: 'GET',
        headers: {
          'Flowbot-WebhookSecret': headerValue,
          'Flowbot-SubscriptionId': staticData.webhookId,
        },
      });
    } catch (error) {
      const errorMsg = (error && typeof error === 'object' && 'message' in error)
        ? (error as any).message
        : String(error);
      throw new Error(
        `Invalid authentication header. ${errorMsg || 'Authentication failed'}.`,
      );
    }

    // Return the body as workflow data
    return {
      workflowData: [[{ json: body }]],
    };
  }

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const staticData = (this as unknown as IWebhookFunctions).getWorkflowStaticData('node');
        return !!staticData.webhookId;
      },
      async create(this: IHookFunctions): Promise<boolean> {
        const mode = this.getMode?.() || 'trigger';
        const workflowId = this.getWorkflow().id;
        const webhookUrl = (this as unknown as IWebhookFunctions).getNodeWebhookUrl('default');
        const triggerKey = 'CREATE_TICKET_TRIGGER_KEY';
        if (mode === 'manual') {
          try {
            const credentials = await this.getCredentials('flowbotApi');
            const client = new FlowbotClient(this as any, { apiKey: credentials.apiKey as string });
            const headers: Record<string, string> = {
              ...(triggerKey ? { triggerKey } : {}),
              webhookUrl: webhookUrl || '',
            };
            const response = await client.request({
              url: '/sample-perform/n8n',
              method: 'POST',
              headers,
            });
            return true;
          } catch (error) {
            const errorMsg = (error && typeof error === 'object' && 'message' in error)
              ? (error as any).message
              : String(error);
            return true;
          }
        }
        const staticData = (this as unknown as IWebhookFunctions).getWorkflowStaticData('node');
        if (staticData.webhookId) {
          return true;
        }
        const credentials = await this.getCredentials('flowbotApi');
        const client = new FlowbotClient(this as any, { apiKey: credentials.apiKey as string });
        const toolName = this.getNodeParameter('tool_name') as string;
        const agentIds = this.getNodeParameter('flowbot_agent') as string[];
        try {
          const response = await client.request({
            url: '/subscribe',
            method: 'POST',
            body: {
              hookUrl: webhookUrl,
              ZapId: workflowId,
              toolName,
              agentId: agentIds,
              triggerKey,
            },
          });

          const webhookId = response.id || response.subscriptionId;
          if (webhookId) {
            staticData.webhookId = webhookId;
          }
          return true;
        } catch (error) {
          const errorMsg = (error && typeof error === 'object' && 'message' in error)
            ? (error as any).message
            : String(error);
          throw new Error(`Subscription failed: ${errorMsg}`);
        }
      },


      async delete(this: IHookFunctions): Promise<boolean> {
        const staticData = (this as unknown as IWebhookFunctions).getWorkflowStaticData('node');
        const webhookId = staticData.webhookId;
        if (!webhookId) {
          return true;
        }
        const credentials = await this.getCredentials('flowbotApi');
        const client = new FlowbotClient(this as any, { apiKey: credentials.apiKey as string });
        try {
          await client.request({
            url: '/unsubscribe',
            method: 'POST',
            body: { id: webhookId },
          });
        } catch (error) {
          const errorMsg = (error && typeof error === 'object' && 'message' in error)
            ? (error as any).message
            : String(error);
          console.error(`[CreateTicketTrigger] Unsubscribe failed: ${errorMsg}`);
        }
        delete staticData.webhookId;
        return true;
      },
    },
  };
}