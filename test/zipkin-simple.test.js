"use strict"

const Lab = require("lab")
const Code = require("code")
const Zipkin = require("..")
const FakeHttp = require("./fake-server")

const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const expect = Code.expect

const FAKE_SERVER_PORT = 9090
const TO_MICROSECONDS = 1000

const Client = new Zipkin({
	port: 9090,
	sampling: 1
})

function now () {
	return new Date().getTime() * TO_MICROSECONDS
}

describe("Zipkin client", function () {

	describe("options", function () {

		it("is possible to swap transport", function (done) {

			function dummyTransport (data) {
				expect(data).to.include(["traceId", "name", "id", "annotations"])
				Client.options({transport: "http"})
				done()
			}

			Client.options({
				transport: dummyTransport
			})

			Client.sendClientSend(null, {
				service: "test service",
				name: "test name"
			})

		})


	})

	describe("Trace data manipulation", function () {

		describe("getChild", function () {

			it("should return data for child span", function (done) {
				const traceData = Client.getChild({
					traceId: "test traceId",
					spanId: "test spanId",
					parentSpanId: "test parent_id",
					sampled: true
				})

				expect(traceData).to.include({
					traceId: "test traceId",
					parentSpanId: "test spanId",
					sampled: true
				})
				expect(traceData).to.include("spanId")

				done()
			})

			it("should carry the sampled state", function (done) {
				const traceData = Client.getChild({
					traceId: "test traceId",
					spanId: "test spanId",
					parentSpanId: "test parent_id",
					sampled: false
				})

				expect(traceData.sampled).to.be.false()

				done()
			})

			it("provides a underscore alias", function (done) {
				expect(Client.get_child).to.equal(Client.getChild)
				done()
			})

			it("should ignore serverOnly attribute", function (done) {
				const traceData = Client.getChild({
					traceId: "test traceId",
					spanId: "test spanId",
					parentSpanId: "test parent_id",
					sampled: true
				})

				expect(traceData).to.include({
					traceId: "test traceId",
					parentSpanId: "test spanId"
				})

				expect(traceData).to.not.include("serverù")

				done()
			})

			it("should create a root trace if none is passed", function (done) {
				const traceData = Client.getChild(null)
				expect(traceData).to.include(["traceId", "spanId", "sampled"])
				expect(traceData.parentSpanId).to.be.null()
				done()
			})

		})

	})

	describe("Standard annotations", function () {
		let fakeHttp

		lab.before(function (done) {
			fakeHttp = FakeHttp(FAKE_SERVER_PORT, done)
		})

		lab.beforeEach(function (done) {
			fakeHttp.reset()
			done()
		})

		lab.after(function (done) {
			fakeHttp.stop()
			done()
		})

		describe("sendClientSend", function () {
			const traceData = {
				traceId: "test traceId",
				spanId: "test spanId",
				parentSpanId: "test parent_id",
				timestamp: now(),
				sampled: true
			}

			it("sends data to zipkin", function (done) {

				fakeHttp.on("request", function (data) {
					try {
						expect(data.url).to.equal("/api/v1/spans")
						expect(data.body).to.be.array()
						expect(data.body).to.include({
							traceId: "test traceId",
							name: "test name",
							id: "test spanId",
							timestamp: traceData.timestamp,
							annotations: [{
								value: "cs",
								endpoint: {
									serviceName: "test service",
									ipv4: 0,
									port: 0
								}
							}],
							binaryAnnotations: []
						})
						expect(data.body[0].annotations[0]).to.include("timestamp")
						expect(data.body[0]).to.not.include("duration")
					}
					catch (ex) {
						return done(ex)
					}

					done()
				})

				Client.sendClientSend(traceData, {
					service: "test service",
					name: "test name"
				})

			})

			it("should create a new trace if none passed", function (done) {
				var data = Client.sendClientSend(null, {
					service: "test service",
					name: "test name"
				})

				expect(data).to.include(["traceId", "spanId", "timestamp", "sampled"])
				expect(data.parentSpanId).to.be.null()
				expect(data.spanId).to.be.equal(data.traceId)
				done()

			})

			it("should not send data for not sampled traces", function (done) {
				fakeHttp.on("request", function (data) {
					done("Shouldn't receive data")
				})

				Client.sendClientSend({sampled: false}, {
					service: "test service",
					name: "test name"
				})

				done()
			})

			it("provides a camel case alias", function (done) {
				expect(Client.send_client_send).to.equal(Client.sendClientSend)
				done()
			})

		})

		describe("sendClientRecv", function () {
			const traceData = {
				traceId: "test traceId",
				spanId: "test spanId",
				parentSpanId: "test parent_id",
				timestamp: now(),
				sampled: true
			}

			it("sends data to zipkin", function (done) {

				fakeHttp.on("request", function (data) {
					try {
						expect(data.url).to.equal("/api/v1/spans")
						expect(data.body).to.be.array()
						expect(data.body).to.include({
							traceId: "test traceId",
							name: "test name",
							id: "test spanId",
							annotations: [{
								value: "cr",
								endpoint: {
									serviceName: "test service",
									ipv4: 0,
									port: 0
								}
							}],
							binaryAnnotations: []
						})
						expect(data.body[0]).to.not.include("timestamp")
						expect(data.body[0].annotations[0]).to.include("timestamp")
						expect(data.body[0].duration).to.equal(data.body[0].annotations[0].timestamp - traceData.timestamp)
					}
					catch (ex) {
						return done(ex)
					}

					done()
				})

				Client.sendClientRecv(traceData, {
					service: "test service",
					name: "test name"
				})

			})

			it("provides a camel case alias", function (done) {
				expect(Client.send_client_recv).to.equal(Client.sendClientRecv)
				done()
			})

		})

		describe("sendServerSend", function () {
			const traceData = {
				traceId: "test traceId",
				spanId: "test spanId",
				parentSpanId: "test parent_id",
				timestamp: now(),
				sampled: true
			}

			it("sends data to zipkin", function (done) {

				fakeHttp.on("request", function (data) {
					try {
						expect(data.url).to.equal("/api/v1/spans")
						expect(data.body).to.be.array()
						expect(data.body).to.include({
							traceId: "test traceId",
							name: "test name",
							id: "test spanId",
							annotations: [{
								value: "ss",
								endpoint: {
									serviceName: "test service",
									ipv4: 0,
									port: 0
								}
							}],
							binaryAnnotations: []
						})
						expect(data.body[0]).to.not.include("timestamp")
						expect(data.body[0].annotations[0]).to.include("timestamp")
						expect(data.body[0]).to.not.include("duration")
					}
					catch (ex) {
						return done(ex)
					}

					done()
				})

				Client.sendServerSend(traceData, {
					service: "test service",
					name: "test name"
				})

			})

			it("sends the duration on server only traces", function (done) {
				const traceData = {
					traceId: "test traceId",
					spanId: "test spanId",
					parentSpanId: "test parent_id",
					timestamp: now(),
					sampled: true,
					serverOnly: true
				}

				fakeHttp.on("request", function (data) {
					try {
						expect(data.url).to.equal("/api/v1/spans")
						expect(data.body).to.be.array()
						expect(data.body).to.include({
							traceId: "test traceId",
							name: "test name",
							id: "test spanId",
							annotations: [{
								value: "ss",
								endpoint: {
									serviceName: "test service",
									ipv4: 0,
									port: 0
								}
							}],
							binaryAnnotations: []
						})
						expect(data.body[0]).to.not.include("timestamp")
						expect(data.body[0].annotations[0]).to.include("timestamp")
						expect(data.body[0].duration).to.equal(data.body[0].annotations[0].timestamp - traceData.timestamp)
					}
					catch (ex) {
						return done(ex)
					}

					done()
				})

				Client.sendServerSend(traceData, {
					service: "test service",
					name: "test name"
				})

			})

			it("provides a camel case alias", function (done) {
				expect(Client.send_server_send).to.equal(Client.sendServerSend)
				done()
			})

		})

		describe("sendServerRecv", function () {
			const traceData = {
				traceId: "test traceId",
				spanId: "test spanId",
				parentSpanId: "test parent_id",
				timestamp: now(),
				sampled: true
			}

			it("sends data to zipkin", function (done) {

				fakeHttp.on("request", function (data) {
					try {
						expect(data.url).to.equal("/api/v1/spans")
						expect(data.body).to.be.array()
						expect(data.body).to.include({
							traceId: "test traceId",
							name: "test name",
							id: "test spanId",
							annotations: [{
								value: "sr",
								endpoint: {
									serviceName: "test service",
									ipv4: 0,
									port: 0
								}
							}],
							binaryAnnotations: []
						})
						expect(data.body[0]).to.not.include("timestamp")
						expect(data.body[0].annotations[0]).to.include("timestamp")
						expect(data.body[0]).to.not.include("duration")
					}
					catch (ex) {
						return done(ex)
					}

					done()
				})

				Client.sendServerRecv(traceData, {
					service: "test service",
					name: "test name"
				})

			})

			it("sends timestamp and creates a serverOnly trace if no trace passed in", function (done) {

				fakeHttp.on("request", function (data) {
					try {
						expect(data.url).to.equal("/api/v1/spans")
						expect(data.body).to.be.array()
						expect(data.body).to.include({
							name: "test name",
							annotations: [{
								value: "sr",
								endpoint: {
									serviceName: "test service",
									ipv4: 0,
									port: 0
								}
							}],
							binaryAnnotations: []
						})
						expect(data.body[0]).to.include("timestamp")
						expect(data.body[0].annotations[0]).to.include("timestamp")
						expect(data.body[0]).to.not.include("duration")
					}
					catch (ex) {
						return done(ex)
					}

					done()
				})

				const data = Client.sendServerRecv(null, {
					service: "test service",
					name: "test name"
				})

				expect(data.serverOnly).to.be.true()

			})

			it("provides a camel case alias", function (done) {
				expect(Client.send_server_recv).to.equal(Client.sendServerRecv)
				done()
			})

		})

	})

})
