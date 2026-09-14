---
name: manage-instance-access
description: Manage users and inference API keys inside a deeplit instance. Use for instance access and application credential tasks.
---

# Manage instance access

The platform key `dk_core_...` authenticates the MCP connection. Instance inference keys beginning with `ak_` are separate credentials and cannot authenticate to MCP.

Inspect existing users or keys before changing them. Obtain explicit approval before setting `confirmed=true` on create or delete operations. Creation may reveal an `ak_` secret once, so return it only to the requesting user and never persist it in repository files or logs.

Use the user-scoped instance tools when operating for a specific instance user. Use the managed instance key tools only when the requested operation is tenant-level instance administration.
