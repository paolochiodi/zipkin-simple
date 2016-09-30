"use strict"

const Lab = require("lab")
const Code = require("code")
const Client = require("..")
const FakeHttp = require("./fake-server")

const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const expect = Code.expect

const FAKE_SERVER_PORT = 9090

Client.options({
	port: 9090,
	sampling: 1
})

describe("Zipkin client", function () {

	describe("Trace data manipulation", function () {

		describe("getData", function () {

			it("should return same data", function (done) {
				var traceData = Client.getData({
					traceId: "test traceId",
					spanId: "test spanId",
					parentSpanId: "test parent_id",
					sampled: true
				})

				expect(traceData).to.include({
					traceId: "test traceId",
					spanId: "test spanId",
					parentSpanId: "test parent_id",
					sampled: true
				})

				done()
			})

			it("should create a new trace if no data is passed", function (done) {
				var traceData = Client.getData()

				expect(traceData).to.include(["traceId", "spanId", "parentSpanId", "sampled", "timestamp"])
				expect(traceData.parentSpanId).to.be.null()
				expect(traceData.traceId).to.equal(traceData.spanId)

				done()
			})

			it("provides a underscore alias", function (done) {
				expect(Client.get_data).to.equal(Client.getData)
				done()
			})

			it("support sampling", function (done) {
				Client.options({sampling: 0.5})

				expect(Client.getData().sampled).to.be.false()
				expect(Client.getData().sampled).to.be.true()
				expect(Client.getData().sampled).to.be.false()
				expect(Client.getData().sampled).to.be.true()

				Client.options({sampling: 1})
				done()
			})

		})

		describe("getChild", function () {

			it("should return data for child span", function (done) {
				var traceData = Client.getChild({
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
				var traceData = Client.getChild({
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
				timestamp: new Date().getTime(),
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

			it("provides a camel case alias", function (done) {
				expect(Client.send_client_send).to.equal(Client.sendClientSend)
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

		})

		describe("sendClientRecv", function () {
			const traceData = {
				traceId: "test traceId",
				spanId: "test spanId",
				parentSpanId: "test parent_id",
				timestamp: new Date().getTime(),
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
								value: "cr",
								endpoint: {
									serviceName: "test service",
									ipv4: 0,
									port: 0
								}
							}],
							binaryAnnotations: []
						})
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
				timestamp: new Date().getTime(),
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
								value: "ss",
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
				timestamp: new Date().getTime(),
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
								value: "sr",
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

				Client.sendServerRecv(traceData, {
					service: "test service",
					name: "test name"
				})

			})

			it("provides a camel case alias", function (done) {
				expect(Client.send_server_recv).to.equal(Client.sendServerRecv)
				done()
			})

		})

	})

})
