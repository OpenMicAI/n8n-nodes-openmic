import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IDataObject,
} from 'n8n-workflow';

import {
	handleCreatePhoneCall,
	handleGetBot,
	handleGetCall,
	handleListBots,
	handleListCalls,
	loadBotOptions,
	loadCallOptions,
} from './ResourceHelpers';

export class OpenMicAi implements INodeType {
	description = {
		displayName: 'OpenMicAI',
		name: 'openMicAi',
		icon: 'file:openmic.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with OpenMicAI API',
		usableAsTool: true,
		defaults: {
			name: 'OpenMicAI',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'openMicApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Phone Call',
						value: 'phoneCall',
					},
					{
						name: 'Bot',
						value: 'bot',
					},
					{
						name: 'Call',
						value: 'call',
					},
				],
				default: 'phoneCall',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['phoneCall'],
					},
				},
				options: [
					{
						name: 'Create a Phone Call',
						value: 'create',
						action: 'Create a phone call',
					},
				],
				default: 'create',
			},
			// Phone Call fields
			{
				displayName: 'From Number (E.164 Format)',
				name: 'from_number',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['phoneCall'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Enter the phone number in E.164 format e.g. +11234567890',
				placeholder: '+11234567890',
			},
			{
				displayName: 'To Number (E.164 Format)',
				name: 'to_number',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['phoneCall'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Enter the phone number in E.164 format e.g. +11234567890',
				placeholder: '+11234567890',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['phoneCall'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Override Agent ID',
						name: 'override_agent_id',
						type: 'string',
						default: '',
						description: 'Enter the Agent UID to override the one attached with the number',
					},
					{
						displayName: 'Customer ID',
						name: 'customer_id',
						type: 'string',
						default: '',
						description:
							'The Customer ID serves as metadata for identifying and tracking API calls, enabling per-customer usage monitoring and billing. It is particularly utilized in whitelabeling integrations via our API.',
					},
					{
						displayName: 'Dynamic Variables',
						name: 'dynamic_variables',
						type: 'json',
						default: '{}',
						description: 'Dynamic variable for mapping to the variables in the prompt',
					},
					{
						displayName: 'Callback URL',
						name: 'callback_url',
						type: 'string',
						default: '',
						description: 'Post-call webhook URL',
					},
				],
			},
			// Bot operations and fields
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['bot'],
					},
				},
				options: [
					{
						name: 'Find Bot',
						value: 'get',
						action: 'Find a bot by ID',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many bots',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Agent UID',
				name: 'uid',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['bot'],
						operation: ['get'],
					},
				},
				default: '',
				description: "Enter the agent's UID",
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
						resource: ['bot'],
						operation: ['getAll'],
					},
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Bot Name Filter',
				name: 'name',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['bot'],
						operation: ['getAll'],
					},
				},
				default: '',
				description: 'Filter bots by name',
			},
			{
				displayName: 'Created After',
				name: 'created_after',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['bot'],
						operation: ['getAll'],
					},
				},
				default: '',
				description: 'Filter bots created after this date',
			},
			{
				displayName: 'Created Before',
				name: 'created_before',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['bot'],
						operation: ['getAll'],
					},
				},
				default: '',
				description: 'Filter bots created before this date',
			},
			// Call operations and fields
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['call'],
					},
				},
				options: [
					{
						name: 'Find Call',
						value: 'get',
						action: 'Find a call by ID',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many calls',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Call Uid',
				name: 'uid',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['get'],
					},
				},
				default: '',
				description: 'Enter the call uid of the call',
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
						resource: ['call'],
						operation: ['getAll'],
					},
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Customer ID',
				name: 'customer_id',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getAll'],
					},
				},
				default: '',
				description:
					'The Customer ID serves as metadata for identifying and tracking API calls, enabling per-customer usage monitoring and billing. It is particularly utilized in whitelabeling integrations via our API.',
			},
			{
				displayName: 'From Number (E.164)',
				name: 'from_number',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getAll'],
					},
				},
				default: '',
				description: 'Enter the phone number in E.164 format e.g. +11234567890',
				placeholder: '+11234567890',
			},
			{
				displayName: 'To Number (E.164)',
				name: 'to_number',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getAll'],
					},
				},
				default: '',
				description: 'Enter the phone number in E.164 format e.g. +11234567890',
				placeholder: '+11234567890',
			},
			{
				displayName: 'Bot ID',
				name: 'bot_id',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getAll'],
					},
				},
				default: '',
				description: 'Filter by bot ID',
			},
			{
				displayName: 'From Date',
				name: 'from_date',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getAll'],
					},
				},
				default: '',
				description: 'Filter calls from this date',
			},
			{
				displayName: 'To Date',
				name: 'to_date',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getAll'],
					},
				},
				default: '',
				description: 'Filter calls to this date',
			},
			{
				displayName: 'Call Status Filter',
				name: 'call_status',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getAll'],
					},
				},
				options: [
					{ name: 'Registered', value: 'registered' },
					{ name: 'Ongoing', value: 'ongoing' },
					{ name: 'Ended', value: 'ended' },
					{ name: 'Error', value: 'error' },
				],
				default: 'registered',
				description: 'Filter by call status',
			},
			{
				displayName: 'Call Type Filter',
				name: 'call_type',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['call'],
						operation: ['getAll'],
					},
				},
				options: [
					{ name: 'Phone Call', value: 'phonecall' },
					{ name: 'Web Call', value: 'webcall' },
				],
				default: 'phonecall',
				description: 'Filter by call type',
			},
		],
	} as unknown as INodeTypeDescription; // usableAsTool is not on the interface, so the linter is complaining

	methods = {
		loadOptions: {
			async getBots(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadBotOptions.call(this);
			},

			async getCalls(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadCallOptions.call(this);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject = {};

				if (resource === 'phoneCall') {
					responseData = await handleCreatePhoneCall.call(this, i);
				} else if (resource === 'bot') {
					if (operation === 'get') {
						responseData = await handleGetBot.call(this, i);
					} else if (operation === 'getAll') {
						responseData = await handleListBots.call(this, i);
					}
				} else if (resource === 'call') {
					if (operation === 'get') {
						responseData = await handleGetCall.call(this, i);
					} else if (operation === 'getAll') {
						responseData = await handleListCalls.call(this, i);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData || {}),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
