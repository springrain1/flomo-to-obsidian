"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUI = void 0;
const obsidian_1 = require("obsidian");
const message_ui_1 = require("./message_ui");
const auth_1 = require("../flomo/auth");
class AuthUI extends obsidian_1.Modal {
    plugin;
    uid;
    passwd;
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.uid = "";
        this.passwd = "";
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h3", { text: "Connecting to Flomo" });
        new obsidian_1.Setting(contentEl)
            .setName('Flomo Signin')
            .setDesc("enter your flomo credential")
            .addText(text => text
            .setPlaceholder('Your userid')
            .onChange(async (value) => {
            this.uid = value;
        }))
            .controlEl.createEl("input", {
            "type": "password",
            "placeholder": "Your password please"
        }).onchange = (ev) => {
            this.passwd = ev.target.value;
        };
        new obsidian_1.Setting(contentEl)
            .setDesc("Prerequisite: 👉 npx playwright@1.43.1 install 👈")
            .addButton((btn) => {
            btn.setButtonText("Cancel")
                .setCta()
                .onClick(async () => {
                await this.plugin.saveSettings();
                this.close();
            });
        })
            .addButton((btn) => {
            btn.setButtonText("Authenticate")
                .setCta()
                .onClick(async () => {
                if (this.uid == "" || this.passwd == "") {
                    new obsidian_1.Notice("Please Enter Your Flomo Username & Password.");
                }
                else {
                    await this.plugin.saveSettings();
                    //console.log(`${this.uid} + ${this.passwd}`);
                    btn.setButtonText("Authenticating...");
                    btn.setDisabled(true);
                    const authResult = await (new auth_1.FlomoAuth().auth(this.uid, this.passwd));
                    btn.setDisabled(false);
                    btn.setButtonText("Authenticate");
                    if (authResult[0] == true) {
                        new message_ui_1.MessageUI(this.app, "🤗 Sign-in was successful.").open();
                        //new Notice("Flomo Sign-in was successful.")
                        this.close();
                    }
                    else {
                        new message_ui_1.MessageUI(this.app, "🥺 Sign-in was failed.").open();
                        new obsidian_1.Notice(`Flomo Sign-in was failed. Details:\n${authResult[1]}`);
                    }
                    //new MessageUI(this.app, "Sign-in was successful.").open();
                }
            });
        });
    }
}
exports.AuthUI = AuthUI;
