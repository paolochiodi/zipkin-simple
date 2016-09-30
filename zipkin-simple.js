
var Wreck = require("wreck")

var HTTP_OK = 200
var HTTP_RECEIVED = 202
var TO_MICROSECONDS = 1000
var ID_LENGTH = 16
var ID_DIGITS = "0123456789abcdef"

var options = {
	sampling: 0.1,
	debug: false,
	host: "127.0.0.1",
	port: "9411",
	path: "/api/v1/spans"
}

var counter = 0

function shouldSample () {
	counter++

	if (counter * options.sampling >= 1) {
		counter = 0
		return true
	}

	return false
}

function send (body) {
	const path = "http://" + options.host + ":" + options.port + options.path
	Wreck.post(path, {payload: [body]}, function sent (err, response, body) {
		if (!options.debug) {
			return
		}

		if (err) {
			return console.log("An error occurred sending trace data", err)
		}

		if (response.statusCode !== HTTP_OK && response.statusCode !== HTTP_RECEIVED) {
			return console.log("Server returned an error:", response.statusCode, "\n", body)
		}
	})
}

function generateTimestamp () {
	// use process.hrtime?
	return new Date().getTime() * TO_MICROSECONDS
}

function generateId () {
	// copied over from zipkin-js
	var n = ""
	for (var i = 0; i < ID_LENGTH; i++) {
		var rand = Math.floor(Math.random() * ID_DIGITS.length)

		// avoid leading zeroes
		if (rand !== 0 || n.length > 0) {
			n += ID_DIGITS[rand]
		}
	}
	return n
}

function createRootTrace () {
	var id = generateId()

	return {
		traceId: id,
		spanId: id,
		parentSpanId: null,
		sampled: shouldSample(),
		timestamp: generateTimestamp()
	}
}

function getData (traceData) {
	if (!traceData) {
		return createRootTrace()
	}

	return traceData
}

function getChild (traceData) {
	if (!traceData) {
		return createRootTrace()
	}

	return {
		traceId: traceData.traceId,
		parentSpanId: traceData.spanId,
		spanId: generateId(),
		sampled: traceData.sampled,
		timestamp: generateTimestamp()
	}
}

function sendTrace (trace, data) {
	if (!trace.sampled) {
		return
	}

	var body = {
		traceId: trace.traceId,
		name: data.name,
		id: trace.spanId,
		timestamp: trace.timestamp,
		annotations: [],
		binaryAnnotations: []
	}

	if (trace.parentSpanId) {
		body.parentId = trace.parentSpanId
	}

	var time = generateTimestamp()
	for (var i = 0; i < data.annotations.length; i++) {
		body.annotations.push({
			endpoint: {
				serviceName: data.service,
				ipv4: 0,
				port: 0
			},
			timestamp: time,
			value: data.annotations[i]
		})

		if (data.annotations[i] === "cr") {
			body.duration = time - trace.timestamp
		}
	}

	send(body)
}

function traceWithAnnotation (trace, data, annotation) {
	if (!trace.sampled) {
		return
	}

	data.annotations = data.annotations || []
	data.annotations.push(annotation)
	return sendTrace(trace, data)
}

function sendClientSend (trace, data) {
	return traceWithAnnotation(trace, data, "cs")
}

function sendClientRecv (trace, data) {
	return traceWithAnnotation(trace, data, "cr")
}

function sendServerSend (trace, data) {
	return traceWithAnnotation(trace, data, "ss")
}

function sendServerRecv (trace, data) {
	return traceWithAnnotation(trace, data, "sr")
}

function setOptions (opts) {
	if (opts) {
		Object.assign(options, opts)
	}

	return options
}

module.exports = {
	options: setOptions,

	getData: getData,
	getChild: getChild,
	sendClientSend: sendClientSend,
	sendClientRecv: sendClientRecv,
	sendServerSend: sendServerSend,
	sendServerRecv: sendServerRecv,


	// underscore aliases

	get_data: getData,
	get_child: getChild,
	send_client_send: sendClientSend,
	send_client_recv: sendClientRecv,
	send_server_send: sendServerSend,
	send_server_recv: sendServerRecv
}
