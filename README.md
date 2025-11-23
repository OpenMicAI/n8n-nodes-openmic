# n8n-nodes-openmic

This is the official n8n node for OpenMic. It provides nodes to interact with the OpenMic API for creating and managing voice AI agents.

[OpenMic](https://openmic.ai) provides APIs for creating conversational AI agents with natural-sounding voices.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### Phone Call

- **Create a Phone Call** - Initiate a phone call between two numbers with optional agent override, customer ID, dynamic variables, and callback URL.

### Bot

- **Find Bot** - Retrieve a specific bot by its Agent UID.
- **Get Many** - List all bots with optional filters (name, created date range) and limit.

### Call

- **Find Call** - Retrieve a specific call by its Call UID.
- **Get Many** - List all calls with optional filters (customer ID, phone numbers, bot ID, date range, call status, call type) and limit.
- **Watch Call (Webhook Trigger)** - Watch a call by its Bot UID and trigger a webhook when the call is completed.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [OpenMic API Documentation](https://docs.openmic.ai)

## Support

For support with this integration, please contact OpenMic support at team@openmic.ai or visit our [documentation](https://docs.openmic.ai).
