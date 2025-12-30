import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';

import { openMicApiRequest } from './GenericFunctions';
import { loadBotOptions } from './ResourceHelpers';

const DEFAULT_FETCH_LIMIT = 1000;

export class OpenMicAiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenMic AI Trigger',
		name: 'openMicAiTrigger',
		icon: 'file:openmic.svg',
		group: ['trigger'],
		polling: true,
		version: 1,
		subtitle: 'OpenMic AI Trigger',
		description: 'Interact with OpenMic AI API Triggers',
		eventTriggerDescription: 'OpenMic AI Trigger',
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
				options: [{ name: 'Watch Calls', value: 'watchCalls' }],
				default: 'watchCalls',
				description: 'Select type of trigger',
			},
			{
				displayName: 'Bot Name or ID',
				name: 'bot_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBots',
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: {
					show: {
						trigger: ['watchCalls'],
					},
				},
			},
			{
				displayName: 'Call Status',
				name: 'callStatus',
				type: 'options',
				options: [
					{ name: 'Ended', value: 'ended' },
					{ name: 'Error', value: 'error' },
					{ name: 'Not Connected', value: 'not_connected' },
					{ name: 'Ongoing', value: 'ongoing' },
					{ name: 'Registered', value: 'registered' },
				],
				default: 'ended',
				description: 'Only return calls with this status',
				displayOptions: {
					show: {
						trigger: ['watchCalls'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: DEFAULT_FETCH_LIMIT,
				},
				description: 'Max number of results to return',
				default: 50,
				displayOptions: {
					show: {
						trigger: ['watchCalls'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getBots(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadBotOptions.call(this);
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('trigger', 0) as string;

		if (event === 'watchCalls') {
			try {
				const callStatus = this.getNodeParameter('callStatus', 0) as string;
				const limit = this.getNodeParameter('limit', 0) as number;
				const botId = this.getNodeParameter('bot_id', 0) as string;

				// Validate limit
				if (!limit || limit < 1 || limit > DEFAULT_FETCH_LIMIT) {
					throw new NodeOperationError(
						this.getNode(),
						`Limit must be between 1 and ${DEFAULT_FETCH_LIMIT}`,
					);
				}

				const qs: Record<string, any> = {
					limit,
					call_status: callStatus,
				};

				if (botId) {
					qs.bot_id = botId;
				}

				const response = await openMicApiRequest.call(this, 'GET', '/v1/calls', {}, qs);

				// Validate response structure
				if (!response) {
					return [
						this.helpers.returnJsonArray([
							{
								_error: true,
								error: 'Empty response from API',
								message: 'The API returned an empty response',
							},
						]),
					];
				}

				if (!response.calls || !Array.isArray(response.calls)) {
					return [
						this.helpers.returnJsonArray([
							{
								_error: true,
								error: 'Invalid response structure',
								message: 'Response does not contain a valid calls array',
								response: response,
							},
						]),
					];
				}

				if (response.calls.length === 0) {
					return null;
				}

				const nodeStaticData = this.getWorkflowStaticData('node');
				const lastSeenTimestamp: number | null =
					(nodeStaticData.lastSeenTimestamp as number) ?? null;

				const newCalls = response.calls.filter((call: any) => {
					// Use end_timestamp if available (for completed calls), otherwise use start_timestamp
					const callTimestamp = call.end_timestamp || call.start_timestamp;
					return lastSeenTimestamp === null || callTimestamp > lastSeenTimestamp;
				});

				if (!newCalls.length) {
					return null;
				}

				// Update last seen timestamp with the most recent call from all calls in response
				// This ensures we don't miss any calls in subsequent polls
				const allTimestamps = response.calls
					.map((call: any) => call.end_timestamp || call.start_timestamp)
					.filter((ts: number) => ts != null);
				if (allTimestamps.length > 0) {
					const maxTimestamp = Math.max(...allTimestamps);
					nodeStaticData.lastSeenTimestamp = maxTimestamp;
				}

				const mappedData = newCalls.map((call: any) => ({
					id: call.call_id,
					callStatus: call.call_status,
					startedAt: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : null,
					endedAt: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : null,
					from: call.from_number,
					to: call.to_number,
					duration: call.duration_ms ? call.duration_ms / 1000 : null,
					botId: call.agent_id,
					customerId: call.customer_id,
					callType: call.call_type,
					direction: call.direction,
					transcript: call.transcript,
					recordingUrl: call.recording_url,
					latency: call.latency,
					callAnalysis: call.call_analysis,
					callCost: call.call_cost,
					dynamicVariables: call.dynamic_variables,
				}));

				return [this.helpers.returnJsonArray(mappedData)];
			} catch (error: any) {
				// Return error information in execution data instead of silently failing
				// This allows debugging when console.log doesn't work
				// NodeApiError has a specific structure with context property
				let errorData: any = {
					_error: true,
					error: error.message || 'Unknown error',
					errorType: error.constructor?.name || 'Error',
				};

				// Extract details from NodeApiError if available
				if (error.context) {
					errorData = {
						...errorData,
						...error.context,
						// NodeApiError context may contain httpCode, nodeCause, etc.
						httpCode: error.context.httpCode,
						description: error.context.description,
					};
				}

				// Extract from standard error response structure
				if (error.response) {
					errorData.statusCode = error.response.status;
					errorData.statusText = error.response.statusText;
					errorData.responseData = error.response.data;
				}

				// Extract from request config
				if (error.request || error.config) {
					errorData.requestUrl = error.request?.path || error.config?.url;
					errorData.requestMethod = error.config?.method;
				}

				// Include stack trace for debugging
				if (error.stack) {
					errorData.stack = error.stack;
				}

				// Include the full error object for deep debugging
				errorData.fullError = {
					name: error.name,
					message: error.message,
					...(error.context && { context: error.context }),
				};

				return [this.helpers.returnJsonArray([errorData])];
			}
		}

		return null;
	}
}
