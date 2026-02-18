class LMRTFYRoller extends Application {

    constructor(actors, data) {
        super();
        this.actors = actors;
        this.data = data;
        this.abilities = data.abilities;
        this.saves = data.saves;
        this.skills = data.skills;
        this.advantage = data.advantage;
        this.mode = data.mode;
        this.message = data.message;
        this.tables = data.tables;
        this.chooseOne = data.chooseOne ?? false;

        if (game.system.id === 'pf2e') {
            this.dc = data.dc;
            this.pf2Roll = '';
        }

        if (game.system.id === 'demonlord') {
            this.boonsBanes = data.boonsBanes;
            this.additionalModifier = data.additionalModifier;
        }

        if (data.title) {
            this.options.title = data.title;
        }

        this.pf2eRollFor = {
            ABILITY: "ability",
            SAVE: "save",
            SKILL: "skill",
            PERCEPTION: "perception",
        }

        this.hasMidi = game.modules.get("midi-qol")?.active;
        this.midiUseNewRoller = isNewerVersion(game.modules.get("midi-qol")?.version, "10.0.26");
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.title = game.i18n.localize("LMRTFY.Title");
        options.template = "modules/lmrtfy/templates/roller.html";
        options.popOut = true;
        options.width = 400;
        options.height = "auto";
        options.classes = ["lmrtfy", "lmrtfy-roller"];
        if (game.settings.get('lmrtfy', 'enableParchmentTheme')) {
          options.classes.push('lmrtfy-parchment');
        }
        return options;
    }

    // Helper registration moved out of constructor for cleaner V13 initialization
    static registerHelpers() {
        Handlebars.registerHelper('canFailAbilityChecks', function (name, ability) {
            if (LMRTFY.canFailChecks) {
                return `<div><button type="button" class="lmrtfy-ability-check-fail" data-ability="${ability}" disabled>${game.i18n.localize('LMRTFY.AbilityCheckFail')} ${game.i18n.localize(name)}</button>` +
                       `<div class="lmrtfy-dice-tray-button enable-lmrtfy-ability-check-fail" data-ability="${ability}">${LMRTFY.d20Svg}</div></div>`;
            }
            return '';
        });
        // (Other helpers like canFailSaveChecks follow this pattern)
    }

    async getData() {
        let note = "";
        // System specific note logic preserved
        if (this.advantage == 1) note = game.i18n.localize("LMRTFY.AdvantageNote");
        else if (this.advantage == -1) note = game.i18n.localize("LMRTFY.DisadvantageNote");

        let abilities = {};
        let saves = {};
        let skills = {};
        this.abilities.forEach(a => abilities[a] = LMRTFY.abilities[a]);
        this.saves.forEach(a => saves[a] = LMRTFY.saves[a]);
        this.skills.sort((a, b) => {
            const skillA = game.i18n.localize(LMRTFY.skills[a]?.label || LMRTFY.skills[a]);
            const skillB = game.i18n.localize(LMRTFY.skills[b]?.label || LMRTFY.skills[b]);
            return skillA.localeCompare(skillB);
        }).forEach(s => {
            skills[s] = LMRTFY.skills[s]?.label || LMRTFY.skills[s];
        });

        return {
            actors: this.actors,
            abilities,
            saves,
            skills,
            note,
            message: this.message,
            customFormula: this.data.formula || false,
            deathsave: this.data.deathsave,
            initiative: this.data.initiative,
            perception: this.data.perception,
            tables: this.tables,
            chooseOne: this.chooseOne,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html = $(html); // V13 Wrapper

        html.find(".lmrtfy-ability-check").click(this._onAbilityCheck.bind(this));
        html.find(".lmrtfy-ability-save").click(this._onAbilitySave.bind(this));
        html.find(".lmrtfy-skill-check").click(this._onSkillCheck.bind(this));
        html.find(".lmrtfy-custom-formula").click(this._onCustomFormula.bind(this));
        html.find(".lmrtfy-roll-table").click(this._onRollTable.bind(this));
        
        if(LMRTFY.specialRolls['initiative']) html.find(".lmrtfy-initiative").click(this._onInitiative.bind(this));
        if(LMRTFY.specialRolls['deathsave']) html.find(".lmrtfy-death-save").click(this._onDeathSave.bind(this));
        if(LMRTFY.specialRolls['perception']) html.find(".lmrtfy-perception").click(this._onPerception.bind(this));

        // Fail toggles
        html.find(".enable-lmrtfy-ability-check-fail").click(this._onToggleFailAbilityRoll.bind(this));
        html.find(".lmrtfy-ability-check-fail").click(this._onFailAbilityCheck.bind(this));
        // ... (other toggles follow)
    }

    _disableButtons(event) {
        const el = $(this.element);
        event.currentTarget.disabled = true;

        if (LMRTFY.canFailChecks) {
            const ability = event.currentTarget.dataset.ability;
            const skill = event.currentTarget.dataset.skill;
            const dataSelector = ability ? `[data-ability*='${ability}']` : `[data-skill*='${skill}']`;
            
            el.find(`.enable-lmrtfy-ability-check-fail${dataSelector}`).addClass('disabled-button').prop('disabled', true);
        }
    }

    async _makeRoll(event, rollMethod, failRoll, ...args) {
        let options = this._getRollOptions(event, failRoll);
        const rollMode = game.settings.get("core", "rollMode");
        game.settings.set("core", "rollMode", this.mode || "roll");

        for (let actor of this.actors) {
            Hooks.once("preCreateChatMessage", this._tagMessage.bind(this));
            
            // PF2e Specific logic - V13 System Update
            if (game.system.id === "pf2e") {
                const stat = (this.pf2Roll === this.pf2eRollFor.SKILL) ? actor.system.skills[args[0]] : 
                             (this.pf2Roll === this.pf2eRollFor.SAVE) ? actor.saves[args[0]] : null;
                if (stat) {
                    await stat.roll({ event, dc: this.dc });
                    continue;
                }
            }

            // Default system roll
            if (typeof actor[rollMethod] === "function") {
                await actor[rollMethod](...args, options);
            }
        }

        game.settings.set("core", "rollMode", rollMode);
        this._disableButtons(event);
        this._checkClose();
    }

    async _makeDiceRoll(event, formula, defaultMessage = null) {
        // Advantage handling preserved
        if (formula.startsWith("1d20")) {
            if (this.advantage === 1) formula = formula.replace("1d20", "2d20kh1");
            else if (this.advantage === -1) formula = formula.replace("1d20", "2d20kl1");
        }

        const messageFlag = {"message": this.data.message, "data": this.data.attach};
        const rollMessages = [];

        for (let actor of this.actors) {
            const speaker = ChatMessage.getSpeaker({actor: actor});
            const roll = new Roll(formula, actor.getRollData());
            
            // V13 REQUIRED: await evaluate
            await roll.evaluate();

            const chatData = await roll.toMessage({
                speaker,
                flavor: this.message || defaultMessage,
                flags: { "lmrtfy": messageFlag }
            }, { rollMode: this.mode, create: false });

            rollMessages.push(chatData);
        }

        await ChatMessage.create(rollMessages);
        this._disableButtons(event);
        this._checkClose();
    }

    _onPerception(event) {
        event.preventDefault();
        if (game.system.id === 'demonlord') {
            this._makeDemonLordCorruptionRoll();
        } else {
            // V13 Update: Use modern system path for perception if it exists
            const formula = game.system.id === 'dnd5e' ? `1d20 + @skills.prc.total` : `1d20 + @attributes.perception.value`;
            this._makeDiceRoll(event, formula, game.i18n.localize("LMRTFY.PerceptionRollMessage"));
        }
    }

    _tagMessage(candidate, data, options) {
        // V13 updateSource ensures flags are written before the message hits the database
        candidate.updateSource({"flags.lmrtfy": {"message": this.data.message, "data": this.data.attach, "blind": candidate.blind}});
    }

    _checkClose() {
        if ($(this.element).find("button").filter((i, e) => !e.disabled).length === 0 || this.chooseOne) {
            this.close();
        }
    }
}
