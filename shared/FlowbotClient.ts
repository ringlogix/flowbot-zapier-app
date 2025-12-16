import {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  IHttpRequestOptions,
} from 'n8n-workflow';
import { CONFIG } from './config';

type RequestCapable = Pick<IExecuteFunctions, 'helpers'> | Pick<ILoadOptionsFunctions, 'helpers'>;

export class FlowbotClient {
  private readonly baseUrl: string;
  private readonly sourceType: string;

  constructor(
    private readonly ctx: RequestCapable,
    private readonly credentials: { apiKey: string },
  ) {
    this.baseUrl = CONFIG.BASE_URL.endsWith('/') ? CONFIG.BASE_URL : CONFIG.BASE_URL + '/';
    this.sourceType = CONFIG.SOURCE_TYPE;
  }

  private getHeaders(): Record<string, string> {
    return {
      'X-API-KEY': this.credentials.apiKey,
      'Flowbot-SourceIntegrationType': this.sourceType,
      Accept: 'application/json',
    };
  }

  async request<T = any>(options: Partial<IHttpRequestOptions> & { url?: string }): Promise<T> {
    const relative = (options.url ?? '').replace(/^\//, '');
    const url = options.url?.startsWith('http') ? options.url! : `${this.baseUrl}${relative}`;

    const opts: IHttpRequestOptions = {
      ...(options as IHttpRequestOptions),
      url,
      headers: {
        ...this.getHeaders(),
        ...(options.headers ?? {}),
      },
      json: true,
    };

    let attempt = 0;
    let lastError: any;

    while (attempt < 3) {
      try {
        return await this.ctx.helpers.request!(opts);
      } catch (error: any) {
        lastError = error;
        const status = error?.statusCode ?? error?.response?.statusCode;
        if ([429, 500, 502, 503, 504].includes(status)) {
          await new Promise((res) => setTimeout(res, 2 ** attempt * 500));
          attempt++;
          continue;
        }
        throw this.normalizeError(error);
      }
    }
    throw this.normalizeError(lastError);
  }

  private normalizeError(error: any): Error {
    if (error?.error?.message) return new Error(error.error.message);
    if (error?.message) return new Error(error.message);
    return new Error('Unknown error');
  }

  static async getAgents(helpers: ILoadOptionsFunctions, credentials: { apiKey: string }) {
    const client = new FlowbotClient(helpers, credentials);
    const agents = await client.request<{ id: string; name: string }[]>({
      url: '/get-agents',
      method: 'GET',
    });
    return agents.map((a) => ({ name: a.name, value: a.id }));
  }
}