import { FlowbotClient } from './FlowbotClient';

describe('FlowbotClient', () => {
  const helpers: any = {
    helpers: {
      request: jest.fn(async (opts) => {
        if (opts.url.includes('fail')) throw { statusCode: 500, message: 'Server error' };
        return { id: '123', name: 'Agent' };
      }),
    },
  };
  const credentials = { apiKey: 'test' };

  it('should make a successful request', async () => {
    const client = new FlowbotClient(helpers, credentials);
    const result = await client.request({ url: 'test', method: 'GET' });
    expect(result).toHaveProperty('id', '123');
  });

  it('should retry and throw on repeated failure', async () => {
    const client = new FlowbotClient(helpers, credentials);
    await expect(client.request({ url: 'fail', method: 'GET' })).rejects.toThrow('Server error');
  });
});