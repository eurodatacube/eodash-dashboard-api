# Dashboard Websocket API

This API doc is manually generated. All the referenced classes can be found either [here](https://github.com/eurodatacube/eodash-dashboard-api/tree/main/src/lib/domain) for domain classes or [here](https://github.com/eurodatacube/eodash-dashboard-api/tree/main/src/lib/dto) for DTOs.

## Connection

The websocket is available at server path `/`.

## Server events

The following [Socket.io](https://socket.io/) events are received by the server. They all receive 2 parameters: `payload: string` and `cb: Function`.

If an error occurs in the validation of the payload for any call, the following object is returned:

```ts
{
  error: true,
  type: 'validation',
  details: ValidationErrorItem[]
}
```

The typing of `ValidationErrorItem` can be found [here](https://github.com/sideway/joi/blob/b05042751fe3164e7fa1e3b763468ef22d1013d0/lib/index.d.ts#L636).

If an error occurs in the execution of a call, the following object is returned:

```ts
{
  error: true,
  type: 'execution',
  message: string
}
```

### connect

Connects to an existing dashboard. If `editKey` is defined, editing privilege is granted to the user.

Throws an error if a non-existing `id` is provider or if the `editKey` provided is incorrect.

```ts
// Payload
{
  id: string,
  editKey?: string
}
```

returns instance of `DashboardDto`.

### create

Creates a new dashboard. The user is automatically connected to the new dashboard and a `listen` call is not required.

```ts
// Payload
{
  title: string,
  features: Feature[],
}
```

returns instance of `Dashboard`.

### listen

Listens to an already existing dashboard.

```ts
// Payload
{
  id: string,
  editKey?: string
}
```

returns instance of `DashboardDto`.

### change-title

Edits the title of the user's connected dashboard.

If the user does not have privilege to edit, an error is thrown.

```ts
// Payload
string; // The new title
```

returns `void`.

### add-feature

Adds a feature to the user's connected dashboard.

If the user does not have privilege to edit, an error is thrown.

```ts
// Payload
Feature;
```

returns `void`.

### remove-feature

Removes a feature from the user's connected dashboard. If the feature does not exist, nothing happens.

If the user does not have privilege to edit, an error is thrown.

```ts
// Payload
number; // The id of the feature
```

returns `void`.

### feature-resize-shrink

Shrinks a feature's width.

If the user does not have privilege to edit, an error is thrown.

```ts
// Payload
number; // The id of the feature
```

returns `void`.

### feature-resize-expand

Expands a feature's width.

If the user does not have privilege to edit, an error is thrown.

```ts
// Payload
number; // The id of the feature
```

returns `void`.

### feature-move-up

Moves a feature up.

If the user does not have privilege to edit, an error is thrown.

```ts
// Payload
number; // The id of the feature
```

returns `void`.

### feature-move-down

Moves a feature down.

If the user does not have privilege to edit, an error is thrown.

```ts
// Payload
number; // The id of the feature
```

returns `void`.

### add-marketing-info

Adds marketing related information to a dashboard.

If the user does not have privilege to edit the dashboard, an error is thrown.

If the marketing info already exists nothing happens.

```ts
// Payload
{
  email: string;
  interests: string[];
  consent: boolean;
}
```

returns `void`.

## Client events

The following events are sent from the server to clients connected to a dashboard.

### edit

The dashboard you are connected to has been edited(either by you, or another client).

```ts
// Payload
DashboardDto;
```
