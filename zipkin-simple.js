
var Wreck = require("wreck")

var HTTP_OK = 200
var HTTP_RECEIVED = 202
var TO_MICROSECONDS = 1000
var ID_LENGTH = 16
var ID_DIGITS = "0123456789abcdef"

var DEFAULT_OPTIONS = {
	sampling: 0.1,
	debug: false,
	host: "127.0.0.1",
	port: "9411",
	path: "/api/v1/spans"
}

function send (body, options) {
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

function zipkinSimple (options) {
	this.counter = 0
	this.options = Object.assign({}, DEFAULT_OPTIONS, options)
}

zipkinSimple.prototype.shouldSample = function shouldSample () {
	this.counter++

	if (this.counter * this.options.sampling >= 1) {
		this.counter = 0
		return true
	}

	return false
}

zipkinSimple.prototype.createRootTrace = function createRootTrace () {
	var id = generateId()

	return {
		traceId: id,
		spanId: id,
		parentSpanId: null,
		sampled: this.shouldSample(),
		timestamp: generateTimestamp()
	}
}

zipkinSimple.prototype.getChild = function getChild (traceData) {
	if (!traceData) {
		return this.createRootTrace()
	}

	return {
		traceId: traceData.traceId,
		parentSpanId: traceData.spanId,
		spanId: generateId(),
		sampled: traceData.sampled,
		timestamp: generateTimestamp()
	}
}

zipkinSimple.prototype.sendTrace = function sendTrace (trace, data) {
	if (!trace.sampled) {
		return
	}

	var body = {
		traceId: trace.traceId,
		name: data.name,
		id: trace.spanId,
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

		if (data.annotations[i] === "cr" || (data.annotations[i] === "ss" && trace.serverOnly)) {
			body.duration = time - trace.timestamp
		}

		if (data.annotations[i] === "cs" || (data.annotations[i] === "sr" && trace.serverOnly)) {
			body.timestamp = trace.timestamp || generateTimestamp()
		}
	}

	send(body, this.options)
}

zipkinSimple.prototype.traceWithAnnotation = function traceWithAnnotation (trace, data, annotation) {
	if (!trace) {
		trace = this.createRootTrace()
	}

	if (!trace.sampled) {
		return trace
	}

	data.annotations = data.annotations || []
	data.annotations.push(annotation)
	this.sendTrace(trace, data)

	return trace
}

zipkinSimple.prototype.sendClientSend = function sendClientSend (trace, data) {
	return this.traceWithAnnotation(trace, data, "cs")
}

zipkinSimple.prototype.sendClientRecv = function sendClientRecv (trace, data) {
	return this.traceWithAnnotation(trace, data, "cr")
}

zipkinSimple.prototype.sendServerSend = function sendServerSend (trace, data) {
	return this.traceWithAnnotation(trace, data, "ss")
}

zipkinSimple.prototype.sendServerRecv = function sendServerRecv (trace, data) {
	if (!trace) {
		trace = this.createRootTrace()
		trace.serverOnly = true
	}

	return this.traceWithAnnotation(trace, data, "sr")
}

zipkinSimple.prototype.setOptions = function setOptions (opts) {
	if (opts) {
		Object.assign(this.options, opts)
	}

	return this.options
}

zipkinSimple.prototype.get_child = zipkinSimple.prototype.getChild
zipkinSimple.prototype.send_client_send = zipkinSimple.prototype.sendClientSend
zipkinSimple.prototype.send_client_recv = zipkinSimple.prototype.sendClientRecv
zipkinSimple.prototype.send_server_send = zipkinSimple.prototype.sendServerSend
zipkinSimple.prototype.send_server_recv = zipkinSimple.prototype.sendServerRecv
zipkinSimple.prototype.set_options = zipkinSimple.prototype.setOptions

module.exports = zipkinSimple
