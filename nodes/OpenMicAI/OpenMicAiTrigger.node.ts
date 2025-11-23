import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { openMicApiRequest } from './GenericFunctions';

export class OpenMicAiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenMic AI Trigger',
		name: 'openMicAiTrigger',
		icon: 'file:openmic.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'OpenMic AI Trigger',
		description: 'Interact with OpenMicAI API Triggers',
		defaults: {
			name: 'OpenMic AI Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'openMicApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Trigger',
				name: 'trigger',
				type: 'options',
				options: [
					{ name: 'New Post-Call Summary', value: 'newPostCallSummary' },
					{ name: 'Fetch Bots', value: 'allBots' },
					{ name: 'Fetch Calls', value: 'allCalls' },
				],
				default: 'newPostCallSummary',
				description: 'Select type of trigger',
			},
			{
				displayName: 'Bot UID',
				name: 'bot_uid',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						trigger: ['newPostCallSummary'],
					},
				},
				default: '',
				description: 'Select your bot',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						trigger: ['allBots', 'allCalls'],
					},
				},
				default: 50,
				description: 'Max number of results to return',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('trigger', 0) as string;

		if (event === 'allBots') {
			try {
				const limit = this.getNodeParameter('limit', 20) as number;

				const response = await openMicApiRequest.call(this, 'GET', '/v1/bots', {}, { limit });

				if (!response.bots || !Array.isArray(response.bots) || response.bots.length === 0) {
					return null;
				}

				const mappedData = response.bots.map((bot: any) => ({
					...bot,
					id: bot.uid,
				}));

				return [this.helpers.returnJsonArray(mappedData)];
			} catch (error) {
				return null;
			}
		}

		if (event === 'allCalls') {
			try {
				const limit = this.getNodeParameter('limit', 20) as number;

				const response = await openMicApiRequest.call(this, 'GET', '/v1/calls', {}, { limit });

				if (!response.calls || !Array.isArray(response.calls) || response.calls.length === 0) {
					return null;
				}

				const mappedData = response.calls.map((call: any) => ({
					...call,
					id: call.call_id,
				}));

				return [this.helpers.returnJsonArray(mappedData)];
			} catch (error) {
				return null;
			}
		}

		return null;
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const method = this.getRequestObject().method;

		if (method === 'GET') {
			// This is likely a test request
			return {
				webhookResponse: { success: true },
			};
		}

		if (method === 'POST') {
			const event = this.getNodeParameter('trigger', 0) as string;

			if (event === 'newPostCallSummary') {
				// The webhook payload should contain the call summary data
				return {
					webhookResponse: bodyData,
				};
			}
		}

		return {
			webhookResponse: bodyData,
		};
	}
}
