# zipkin-simple

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]

> A simple node.js client for [zipkin](http://zipkin.io) tracing system


This is a basic alternative to the official (and more complete) [zipkin-js](https://github.com/openzipkin/zipkin-js).

Focus of this version is being easier to use and having a more idiomatic api.

## Current Caveats

- Only http transport
- Only standard annotations (client send, client receive, server send and server receive)


## Install

```
npm install zipkin-simple --save
```

## Usage

```js
var Zipkin = require('zipkin-simple')
var tracer = new Zipkin({
  debug: false,
  host: "127.0.0.1",
  port: "9411",
  path: "/api/v1/spans"
})

var traceData
traceData = tracer.sendClientSend(traceData, {
  service: 'service name',
  name: 'endpoint name'
})
```

The basic idea is that the tracer only manage the comunication to the zipkin server and lets you manage the trace data however you prefer.

This means that it's up to you on how to store the trace data and how to sync that among clients and servers.

Zipkin suggest to use http headers, but you are free to use anything else.

## Transports

At the current version zipkin-simple only support three type of transports: http, http-simple, custom function

Http sends traces via http in batches of configurable sizes, in order to decrease the traffic to the zipkin server. This is the default

Http-simple sends a request for each trace "update" (i.e. adding a new trace) and thus is not suited for production environments

You can also pass in a custom function that will be used as the transport. It will receive a call every time there's a trace update with the trace data and the current zipking options:

```
tracer.options({
  transport: function dummy(data, options) {
    console.log(data)
  }
})
```
In this example each trace update will be logged on the console instead of being sent to zipkin.

Another example can be found in the tests.

## API

We use the names "client process" and "server process" as in zipkin documentation but zipkin-simple can also be used in a single process environment or to track local methods. In this case consider "client process" as the caller method and server process as the called method.

You also don't need to send both client and server annotations, especially when tracking local methods.
Just one of the two couples will suffice to zipkin to correctly generate the spans.

All methods are in "underscore" notation but provide camelCase aliases, use the one that fits your style better.

See an usage example in [seneca-zipkin-tracer](https://github.com/senecajs-labs/seneca-zipkin-tracer)

<a name="options"></a>
### tracer.options(opts)

If opts is passed in update current options, otherwise just return existing options.

Options include:
- debug: wether to write debug info to the console
- host: the hostname or ip address for the zipkin server
- port: the port for the http transport of the zipkin server
- path: the endpoint where to send data on the zipkin server (if uncertain, leave the default unchanged)
- sampling: the sampling ratio, from 0 to 1 (0 means don't send data, 1 send all data)
- transport: which transport to use. Currently supported are "html" (default), "html-simple" or a custom function. Each transport may have additional options available
- batchSize: for http transport only, size of the batch of traces to send to zipkin
- batchTimeout: for http transport only, inactivity time before sending uncompleted batches to zipkin


<a name="sendClientSend"></a>
### tracer.sendClientSend(traceData, annotationData)

Add the `cs` annotation to the current span (and trace).

This is intended to be used on the client process just before it fires a request to the server.

Whilest annotationData is mandatory, traceData can be null: in that case a new root trace will be created.

The methods return a new or updated `traceData` to be used for further calls

<a name="annotationData"></a>
Annotation Data contains additional info about the current method:
- service: the name of the current service. It should be an identifier of running process (or class of processes), i.e.: `web_server`, `background_worker`, `checkout_process`. This will be displayed in the zipkin console
- name: the name of the method being tracked, i.e.: `POST /user` or `update_credentials`. Thi will be displayed in the zipking console on the single span

<a name="sendClientReceive"></a>
### tracer.sendClientReceive(traceData, annotationData)

Add the `cr` annotation to the current span (and trace).

This is intended to be used on the client process when it receives data back from the server.

Both traceData and annotationData are mandatory.

[For details about annotationData see here](#annotationData)


<a name="sendServerReceive"></a>
### tracer.sendServerReceive(traceData, annotationData)

Add the `sr` to the current span (and trace).

This is intended to be used on the server process as soon it receives data from the client.

Whilest annotationData is mandatory, traceData can be null: in that case a new root trace will be created and the trace will be considered to be server-only

[For details about annotationData see here](#annotationData)

<a name="sendServerSend"></a>
### tracer.sendServerSend(traceData, annotationData)

Add the `ss` to the current span (and trace).

This is intended to be used on the server process when it has completed its operations and is about to send data back to the client.

Both traceData and annotationData are mandatory.

[For details about annotationData see here](#annotationData)

<a name="getChild"></a>
### tracer.getChild(traceData)

Return trace data to be sent alongside the next child request.

This is used to generate a child span, in example when the current request calls another endpoint before completing.

`traceData` is the data related to the current span as returned by one of the send methods. If null or undefined a new root trace is generated

## License

MIT

## Acknowledgements

Maintainer - [Paolo Chiodi](https://github.com/paolochiodi)

This project was kindly sponsored by [nearForm](http://nearform.com).

[npm-badge]: https://badge.fury.io/js/zipkin-simple.svg
[npm-url]: https://badge.fury.io/js/zipkin-simple
[travis-badge]: https://travis-ci.org/paolochiodi/zipkin-simple.svg
[travis-url]: https://travis-ci.org/paolochiodi/zipkin-simple
