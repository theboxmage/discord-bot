import { createSandbox, SinonSandbox } from "sinon";
import { expect } from "chai";
import { Message } from "discord.js";

// @ts-ignore
import MockDiscord from "../MockDiscord";
import GitHubCommand from "../../src/commands/GitHubCommand";
import Command from "../../src/abstracts/Command";
import GitHubService from "../../src/services/GitHubService";
import { EMBED_COLOURS } from "../../src/config.json";

describe("GitHubCommand", () => {
	describe("constructor", () => {
		it("creates a command called github", () => {
			const command = new GitHubCommand();

			expect(command.getName()).to.equal("github");
		});

		it("creates a command with correct description", () => {
			const command = new GitHubCommand();

			expect(command.getDescription()).to.equal("Shows the repo of the given user.");
		});
	});

	describe("run()", () => {
		let sandbox: SinonSandbox;
		let message: Message;
		let command: Command;
		let discordMock: MockDiscord;
		let gitHub: GitHubService;

		beforeEach(() => {
			sandbox = createSandbox();
			command = new GitHubCommand();
			discordMock = new MockDiscord();
			message = discordMock.getMessage();
			gitHub = GitHubService.getInstance();
		});

		it("sends a message to the channel", async () => {
			const messageMock = sandbox.stub(message.channel, "send");

			sandbox.stub(gitHub, "getRepository");
			sandbox.stub(gitHub, "getPullRequest");

			await command.run(message, ["user", "repo"]);

			expect(messageMock.calledOnce).to.be.true;
		});

		it("states you must define a username and repository if none is given", async () => {
			const messageMock = sandbox.stub(message.channel, "send");

			await command.run(message);

			// @ts-ignore - firstArg does not live on getCall()
			const embed = messageMock.getCall(0).firstArg.embed;

			expect(messageMock.calledOnce).to.be.true;
			expect(embed.title).to.equal("Error");
			expect(embed.description).to.equal("You must provide a username and repo from GitHub.");
			expect(embed.hexColor).to.equal(EMBED_COLOURS.ERROR.toLowerCase());
		});

		it("states it had a problem with the request to GitHub", async () => {
			const messageMock = sandbox.stub(message.channel, "send");

			sandbox.stub(gitHub, "getRepository").resolves(null);
			sandbox.stub(gitHub, "getPullRequest").resolves(null);

			await command.run(message, ["thisuserdoesnotexist", "thisrepodoesnotexist"]);

			// @ts-ignore - firstArg does not live on getCall()
			const embed = messageMock.getCall(0).firstArg.embed;

			expect(messageMock.calledOnce).to.be.true;
			expect(embed.title).to.equal("Error");
			expect(embed.description).to.equal("There was a problem with the request to GitHub.");
			expect(embed.hexColor).to.equal(EMBED_COLOURS.ERROR.toLowerCase());
		});

		it("states the result from the github service", async () => {
			const messageMock = sandbox.stub(message.channel, "send");

			sandbox.stub(gitHub, "getRepository").resolves({
				user: "user",
				repo: "repo",
				description: "This is the description",
				language: "TypeScript",
				url: "https://github.com/codesupport/discord-bot",
				issues_and_pullrequests_count: 3
			});

			sandbox.stub(gitHub, "getPullRequest").resolves(
				[{
					title: "This is the title",
					description: "This is the description",
					author: "user"
				}]
			);

			await command.run(message, ["user", "repo"]);

			// @ts-ignore - firstArg does not live on getCall()
			const embed = messageMock.getCall(0).firstArg.embed;

			expect(messageMock.calledOnce).to.be.true;
			expect(embed.title).to.equal("GitHub Repository: user/repo");
			expect(embed.description).to.equal("This is the description\n\n[View on GitHub](https://github.com/codesupport/discord-bot)");
			expect(embed.fields[0].name).to.equal("Language");
			expect(embed.fields[0].value).to.equal("TypeScript");
			expect(embed.fields[1].name).to.equal("Open issues");
			expect(embed.fields[1].value).to.equal("2");
			expect(embed.fields[2].name).to.equal("Open Pull Requests");
			expect(embed.fields[2].value).to.equal("1");
			expect(embed.hexColor).to.equal(EMBED_COLOURS.SUCCESS.toLowerCase());
		});

		afterEach(() => {
			sandbox.restore();
		});
	});
});