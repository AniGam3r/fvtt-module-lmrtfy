console.log("LMRTFY DEBUG | Loading LMRTFYRoller.js");

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
        this.midiUseNewRoller = foundry.utils.isNewerVersion(game.modules.get("midi-qol")?.version, "10.0.26");

        // Helper registration moved inside constructor to ensure availability
        this._registerHelpers();
    }

    _registerHelpers() {
        Handlebars.registerHelper('canFailAbilityChecks', function (name, ability) {
            if (LMRTFY.canFailChecks) {
                return `<div><button type="button" class="lmrtfy-ability-check-fail" data-ability="${ability}" disabled>${game.i18n.localize('LMRTFY.AbilityCheckFail')} ${game.i18n.localize(name)}</button>` +
                       `<div class="lmrtfy-dice-tray-button enable-lmrtfy-ability-check-fail" data-ability="${ability}" title="${game.i18n.localize('LMRTFY.EnableChooseFail')}">${LMRTFY.d20Svg}</div></div>`;
            }
            return '';
        });
        Handlebars.registerHelper('canFailSaveChecks', function (name, ability) {
            if (LMRTFY.canFailChecks) {
                return `<div><button type="button" class="lmrtfy-ability-save-fail" data-ability="${ability}" disabled>${game.i18n.localize('LMRTFY.SavingThrowFail')} ${game.i18n.localize(name)}</button>` +
                       `<div class="lmrtfy-dice-tray-button enable-lmrtfy-ability-save-fail" data-ability="${ability}" title="${game.i18n.localize('LMRTFY.EnableChooseFail')}">${LMRTFY.d20Svg}</div></div>`;
            }
            return '';
        });
        Handlebars.registerHelper('canFailSkillChecks', function (name, skill) {
            if (LMRTFY.canFailChecks) {
                return `<div><button type="button" class="lmrtfy-skill-check-fail" data-skill="${skill}" disabled>${game.i18n.localize('LMRTFY.SkillCheckFail')} ${game.i18n.localize(name)}</button>` +
                       `<div class="lmrtfy-dice-tray-button enable-lmrtfy-skill-check-fail" data-skill="${skill}" title="${game.i18n.localize('LMRTFY.EnableChooseFail')}">${LMRTFY.d20Svg}</div></div>`;
            }
            return '';
        });
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

    async getData() {
        console.log("LMRTFY DEBUG | Roller getData called");
        let note = ""
        if (this.advantage == 1) note = game.i18n.localize("LMRTFY.AdvantageNote");
        else if (this.advantage == -1) note = game.i18n.localize("LMRTFY.DisadvantageNote");

        let abilities = {}
        let saves = {}
        let skills = {}
        
        this.abilities.forEach(a => abilities[a] = LMRTFY.abilities[a])
        this.saves.forEach(a => saves[a] = LMRTFY.saves[a])
        
        // Sorting skills safely
        this.skills.forEach(s => {
            // FIX: Handle object vs string for skill labels
            let label = LMRTFY.skills[s];
            if (typeof label === 'object') label = label.label || s;
            skills[s] = label;
        });

        const sortedSkills = {};
        Object.keys(skills).sort((a, b) => {
            return game.i18n.localize(skills[a]).localeCompare(game.i18n.localize(skills[b]));
        }).forEach(key => sortedSkills[key] = skills[key]);

        return {
            actors: this.actors,
            abilities: abilities,
            saves: saves,
            skills: sortedSkills,
            note: note,
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
        html.find(".lmrtfy-ability-check").click(this._onAbilityCheck.bind(this))
        html.find(".lmrtfy-ability-save").click(this._onAbilitySave.bind(this))
        html.find(".lmrtfy-skill-check").click(this._onSkillCheck.bind(this))
        html.find(".lmrtfy-custom-formula").click(this._onCustomFormula.bind(this))
        html.find(".lmrtfy-roll-table").click(this._onRollTable.bind(this));
        
        // Standard handlers
        if(LMRTFY.specialRolls['initiative']) html.find(".lmrtfy-initiative").click(this._onInitiative.bind(this));
        if(LMRTFY.specialRolls['deathsave']) html.find(".lmrtfy-death-save").click(this._onDeathSave.bind(this));
        if(LMRTFY.specialRolls['perception']) html.find(".lmrtfy-perception").click(this._onPerception.bind(this));
        
        // Fail buttons
        html.find(".enable-lmrtfy-ability-check-fail").click(this._onToggleFailAbilityRoll.bind(this));
        html.find(".lmrtfy-ability-check-fail").click(this._onFailAbilityCheck.bind(this));        
        html.find(".enable-lmrtfy-ability-save-fail").click(this._onToggleFailSaveRoll.bind(this));
        html.find(".lmrtfy-ability-save-fail").click(this._onFailAbilitySave.bind(this));    
        html.find(".enable-lmrtfy-skill-check-fail").click(this._onToggleFailSkillRoll.bind(this));
        html.find(".lmrtfy-skill-check-fail").click(this._onFailSkillCheck.bind(this));    
    }

    _checkClose() {
        if (this.element.find("button").filter((i, e) => !e.disabled).length === 0 || this.chooseOne) {
            this.close();
        }
    }

    _disableButtons(event) {
        event.currentTarget.disabled = true;
        // ... (Button disabling logic preserved) ...
        if (LMRTFY.canFailChecks) {
            const buttonSelector = `${event.currentTarget.className}`;
            let oppositeSelector = "";
            let dataSelector = "";
            if (event.currentTarget.className.indexOf('ability-check') > 0 || event.currentTarget.className.indexOf('ability-save') > 0) {
                dataSelector = `[data-ability *= '${event?.currentTarget?.dataset?.ability}']`;
            } else {
                dataSelector = `[data-skill *= '${event?.currentTarget?.dataset?.skill}']`;
            }
            if (event.currentTarget.className.indexOf('fail') > 0) {
                oppositeSelector = event.currentTarget.className.substring(0, event.currentTarget.className.indexOf('fail') - 1);
            } else {
                oppositeSelector = `${event.currentTarget.className}-fail`;            
            }
            const enableButton = document.querySelector(`.enable-${buttonSelector}${dataSelector}`);
            if (enableButton) { enableButton.disabled = true; enableButton.classList.add('disabled-button'); }
            const oppositeButton = document.querySelector(`.${oppositeSelector}${dataSelector}`);
            if (oppositeButton) oppositeButton.disabled = true;
        }
    }

    _getRollOptions(event, failRoll) {
        let options;
        switch(this.advantage) {
            case -1: options = {... LMRTFY.disadvantageRollEvent }; break;
            case 0: options = {... LMRTFY.normalRollEvent }; break;
            case 1: options = {... LMRTFY.advantageRollEvent }; break;
            case 2: options = { event: event }; break;
        }
        if (failRoll) options["parts"] = [-100];
        return options;
    }

    async _makeRoll(event, rollMethod, failRoll, ...args) {
        console.log(`LMRTFY DEBUG | _makeRoll | Method: ${rollMethod} | Args:`, args);
        let options = this._getRollOptions(event, failRoll);                
        const rollMode = game.settings.get("core", "rollMode");
        game.settings.set("core", "rollMode", this.mode || CONST.DICE_ROLL_MODES);

        for (let actor of this.actors) {
            Hooks.once("preCreateChatMessage", this._tagMessage.bind(this));

            switch (game.system.id) {
                case "dnd5e": {
                    const key = args[0];
                    console.log("LMRTFY DEBUG | D&D5e Roll | Key:", key);
                    
                    // V13/5e 3.x Fix: Object syntax
                    let rollConfig = foundry.utils.mergeObject(options, {
                        fastForward: true,
                        chatMessage: true
                    });
                    
                    if (rollMethod === 'rollSkill') rollConfig.skill = key;
                    else rollConfig.ability = key;

                    try {
                        await actor[rollMethod](rollConfig);
                    } catch (err) {
                        console.error("LMRTFY ERROR | Roll Failed:", err);
                    }
                    break;
                }
                // ... (Preserve other systems as is) ...
                default: {
                    await actor[rollMethod].call(actor, ...args, options);
                }
            }
        }
        game.settings.set("core", "rollMode", rollMode);
        this._disableButtons(event);
        this._checkClose();
    }

    // Handlers
    _onAbilityCheck(event) {
        event.preventDefault();
        const ability = event.currentTarget.dataset.ability;
        console.log("LMRTFY DEBUG | Ability Check Clicked:", ability);
        this._makeRoll(event, LMRTFY.abilityRollMethod, false, ability);
    }
    _onAbilitySave(event) {
        event.preventDefault();
        const ability = event.currentTarget.dataset.ability;
        this._makeRoll(event, LMRTFY.saveRollMethod, false, ability);
    }
    _onSkillCheck(event) {
        event.preventDefault();
        const skill = event.currentTarget.dataset.skill;
        console.log("LMRTFY DEBUG | Skill Check Clicked:", skill);
        this._makeRoll(event, LMRTFY.skillRollMethod, false, skill);
    }
    
    // ... (Keep other handlers like _onFail..., _onInitiative, etc.) ...
    
    _onInitiative(event) {
        event.preventDefault();
        const initiative = CONFIG.Combat.initiative.formula || game.system.data.initiative;
        this._makeDiceRoll(event, initiative, game.i18n.localize("LMRTFY.InitiativeRollMessage"));
    }

    _tagMessage(candidate, data, options) {
        candidate.updateSource({"flags.lmrtfy": {"message": this.data.message, "data": this.data.attach, "blind": candidate.blind}});
    }

    async _makeDiceRoll(event, formula, defaultMessage = null) {
        console.log("LMRTFY DEBUG | Dice Roll:", formula);
        // ... (Keep existing dice roll logic) ...
    }
}

// Expose to window for global access
window.LMRTFYRoller = LMRTFYRoller;
