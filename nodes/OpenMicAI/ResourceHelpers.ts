import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { validateE164Number, openMicApiRequest } from './GenericFunctions';

export async function handleCreatePhoneCall(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject> {
	const fromNumber = this.getNodeParameter('from_number', i) as string;
	const toNumber = this.getNodeParameter('to_number', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
	const overrideAgentId = (additionalFields.override_agent_id as string) || '';
	const customerId = (additionalFields.customer_id as string) || '';
	const dynamicVariables = (additionalFields.dynamic_variables as IDataObject) || {};
	const callbackUrl = (additionalFields.callback_url as string) || '';

	// Validate phone numbers
	if (!validateE164Number(fromNumber)) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid phone number format for From Number. Must be in E.164 format (e.g., +14157774444)`,
			{ itemIndex: i },
		);
	}
	if (!validateE164Number(toNumber)) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid phone number format for To Number. Must be in E.164 format (e.g., +14157774444)`,
			{ itemIndex: i },
		);
	}

	const body: IDataObject = {
		from_number: fromNumber,
		to_number: toNumber,
	};

	if (overrideAgentId) {
		body.override_agent_id = overrideAgentId;
	}
	if (customerId) {
		body.customer_id = customerId;
	}
	if (Object.keys(dynamicVariables).length > 0) {
		body.dynamic_variables = dynamicVariables;
	}
	if (callbackUrl) {
		body.callback_url = callbackUrl;
	}

	return await openMicApiRequest.call(this, 'POST', '/v1/create-phone-call', body);
}

export async function handleGetBot(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const uid = this.getNodeParameter('uid', i) as string;

	return await openMicApiRequest.call(this, 'GET', `/v1/bots/${uid}`);
}

export async function handleGetCall(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const uid = this.getNodeParameter('uid', i) as string;

	return await openMicApiRequest.call(this, 'GET', `/v1/call/${uid}`);
}

export async function handleListBots(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const qs: IDataObject = {};

	const limit = this.getNodeParameter('limit', i, 20) as number;
	const name = this.getNodeParameter('name', i, '') as string;
	const createdAfter = this.getNodeParameter('created_after', i, '') as string;
	const createdBefore = this.getNodeParameter('created_before', i, '') as string;

	if (limit) {
		qs.limit = limit;
	}
	if (name) {
		qs.name = name;
	}
	if (createdAfter) {
		qs.created_after = createdAfter;
	}
	if (createdBefore) {
		qs.created_before = createdBefore;
	}

	const response = await openMicApiRequest.call(this, 'GET', '/v1/bots', {}, qs);
	return response;
}

export async function handleListCalls(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const qs: IDataObject = {};

	const limit = this.getNodeParameter('limit', i, 20) as number;
	const customerId = this.getNodeParameter('customer_id', i, '') as string;
	const fromNumber = this.getNodeParameter('from_number', i, '') as string;
	const toNumber = this.getNodeParameter('to_number', i, '') as string;
	const botId = this.getNodeParameter('bot_id', i, '') as string;
	const fromDate = this.getNodeParameter('from_date', i, '') as string;
	const toDate = this.getNodeParameter('to_date', i, '') as string;
	const callStatus = this.getNodeParameter('call_status', i, '') as string;
	const callType = this.getNodeParameter('call_type', i, '') as string;

	if (limit) {
		qs.limit = limit;
	}
	if (customerId) {
		qs.customer_id = customerId;
	}
	if (fromNumber) {
		qs.from_number = fromNumber;
	}
	if (toNumber) {
		qs.to_number = toNumber;
	}
	if (botId) {
		qs.bot_id = botId;
	}
	if (fromDate) {
		qs.from_date = fromDate;
	}
	if (toDate) {
		qs.to_date = toDate;
	}
	if (callStatus) {
		qs.call_status = callStatus;
	}
	if (callType) {
		qs.call_type = callType;
	}

	const response = await openMicApiRequest.call(this, 'GET', '/v1/calls', {}, qs);
	return response;
}

export async function loadBotOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string; description?: string }>> {
	const response = await openMicApiRequest.call(this, 'GET', '/v1/bots', {}, { limit: 100 });

	if (response.bots && Array.isArray(response.bots)) {
		return response.bots.map((bot: JsonObject) => ({
			name: bot.name as string,
			value: bot.uid as string,
			description: `Agent: ${bot.name}`,
		}));
	}

	return [];
}

export async function loadCallOptions(
	this: ILoadOptionsFunctions,
): Promise<Array<{ name: string; value: string; description?: string }>> {
	const response = await openMicApiRequest.call(this, 'GET', '/v1/calls', {}, { limit: 100 });

	if (response.calls && Array.isArray(response.calls)) {
		return response.calls.map((call: JsonObject) => ({
			name: `${call.call_id} (${call.call_status})`,
			value: call.call_id as string,
			description: `${call.from_number} → ${call.to_number}`,
		}));
	}

	return [];
}
