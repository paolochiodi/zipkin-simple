"use strict"

const Lab = require("Lab")
const Code = require("code")
const Client = require("..")
const FakeHttp = require("./fake-server")

const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const expect = Code.expect

const FAKE_SERVER_PORT = 9090

Client.options({
	port: 9090
})

describe("Zipkin client", function () {

	describe("Trace data manipulation", function () {

		describe("get_data", function () {

			it("should return same data", function (done) {
				var trace_data = Client.get_data({
					trace_id: "test trace_id",
					span_id: "test span_id",
					parent_span_id: "test parent_id",
					sampled: true
				})

				expect(trace_data).to.include({
					trace_id: "test trace_id",
					span_id: "test span_id",
					parent_span_id: "test parent_id",
					sampled: true
				})

				done()
			})

			it("should create a new trace if no data is passed", function (done) {
				var trace_data = Client.get_data()

				expect(trace_data).to.include(["trace_id", "span_id", "parent_span_id", "sampled", "timestamp"])
				expect(trace_data.parent_span_id).to.be.null()
				expect(trace_data.trace_id).to.equal(trace_data.span_id)

				done()
			})

		})

		describe("get_child", function () {

			it("should return data for child span", function (done) {
				var trace_data = Client.get_child({
					trace_id: "test trace_id",
					span_id: "test span_id",
					parent_span_id: "test parent_id",
					sampled: true
				})

				expect(trace_data).to.include({
					trace_id: "test trace_id",
					parent_span_id: "test span_id",
					sampled: true
				})
				expect(trace_data).to.include("span_id")

				done()
			})

			it("should carry the sampled state", function (done) {
				var trace_data = Client.get_child({
					trace_id: "test trace_id",
					span_id: "test span_id",
					parent_span_id: "test parent_id",
					sampled: false
				})

				expect(trace_data.sampled).to.be.false()

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

		describe("client_send", function () {
			const trace_data = {
				trace_id: "test trace_id",
				span_id: "test span_id",
				parent_span_id: "test parent_id",
				timestamp: "test timestamp",
				sampled: true
			}

			it("sends data to zipkin", function (done) {

				fakeHttp.on("request", function (data) {
					try {
						expect(data.url).to.equal("/api/v1/spans")
						expect(data.body).to.be.array()
						expect(data.body).to.include({
							traceId: "test trace_id",
							name: "test name",
							id: "test span_id",
							timestamp: "test timestamp",
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
					}
					catch (ex) {
						return done(ex)
					}

					done()
				})

				Client.client_send(trace_data, {
					service: "test service",
					name: "test name"
				})

			})

		})

		describe("client_recv", function () {
			const trace_data = {
				trace_id: "test trace_id",
				span_id: "test span_id",
				parent_span_id: "test parent_id",
				timestamp: "test timestamp",
				sampled: true
			}

			it("sends data to zipkin", function (done) {

				fakeHttp.on("request", function (data) {
					try {
						expect(data.url).to.equal("/api/v1/spans")
						expect(data.body).to.be.array()
						expect(data.body).to.include({
							traceId: "test trace_id",
							name: "test name",
							id: "test span_id",
							timestamp: "test timestamp",
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
					}
					catch (ex) {
						return done(ex)
					}

					done()
				})

				Client.client_recv(trace_data, {
					service: "test service",
					name: "test name"
				})

			})

		})

		describe("server_send", function () {
			const trace_data = {
				trace_id: "test trace_id",
				span_id: "test span_id",
				parent_span_id: "test parent_id",
				timestamp: "test timestamp",
				sampled: true
			}

			it("sends data to zipkin", function (done) {

				fakeHttp.on("request", function (data) {
					try {
						expect(data.url).to.equal("/api/v1/spans")
						expect(data.body).to.be.array()
						expect(data.body).to.include({
							traceId: "test trace_id",
							name: "test name",
							id: "test span_id",
							timestamp: "test timestamp",
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
					}
					catch (ex) {
						return done(ex)
					}

					done()
				})

				Client.server_send(trace_data, {
					service: "test service",
					name: "test name"
				})

			})

		})

		describe("server_recv", function () {
			const trace_data = {
				trace_id: "test trace_id",
				span_id: "test span_id",
				parent_span_id: "test parent_id",
				timestamp: "test timestamp",
				sampled: true
			}

			it("sends data to zipkin", function (done) {

				fakeHttp.on("request", function (data) {
					try {
						expect(data.url).to.equal("/api/v1/spans")
						expect(data.body).to.be.array()
						expect(data.body).to.include({
							traceId: "test trace_id",
							name: "test name",
							id: "test span_id",
							timestamp: "test timestamp",
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
					}
					catch (ex) {
						return done(ex)
					}

					done()
				})

				Client.server_recv(trace_data, {
					service: "test service",
					name: "test name"
				})

			})

		})

	})

})
