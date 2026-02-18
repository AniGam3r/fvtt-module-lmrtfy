class LMRTFY {
    static async init() {
        game.settings.register('lmrtfy', 'enableParchmentTheme', {
            name: game.i18n.localize('LMRTFY.EnableParchmentTheme'),
            hint: game.i18n.localize('LMRTFY.EnableParchmentThemeHint'),
            scope: 'client',
            config: true,
            type: Boolean,
            default: true,
            onChange: (value) => LMRTFY.onThemeChange(value)
        });
        game.settings.register('lmrtfy', 'deselectOnRequestorRender', {
            name: game.i18n.localize('LMRTFY.DeselectOnRequestorRender'),
            hint: game.i18n.localize('LMRTFY.DeselectOnRequestorRenderHint'),
            scope: 'world',
            config: true,
            type: Boolean,
            default: false,
            onChange: () => window.location.reload()
        });
        game.settings.register('lmrtfy', 'useTokenImageOnRequester', {
            name: game.i18n.localize('LMRTFY.UseTokenImageOnRequester'),
            hint: game.i18n.localize('LMRTFY.UseTokenImageOnRequesterHint'),
            scope: 'world',
            config: true,
            type: Boolean,
            default: false,
            onChange: () => window.location.reload()
        });

        var showFailButtonSetting = false;
        if (game.system.id === 'dnd5e') {
            showFailButtonSetting = true;
        }
        game.settings.register('lmrtfy', 'showFailButtons', {
            name: game.i18n.localize('LMRTFY.ShowFailButtons'),
            hint: game.i18n.localize('LMRTFY.ShowFailButtonsHint'),
            scope: 'world',
            config: showFailButtonSetting,
            type: Boolean,
            default: showFailButtonSetting,
            onChange: () => window.location.reload()
        });

        Handlebars.registerHelper('lmrtfy-controlledToken', function (actor) {
            const actorsControlledToken = canvas.tokens?.controlled.find(t => t.actor.id === actor.id);
            return !!actorsControlledToken;
        });

        Handlebars.registerHelper('lmrtfy-showTokenImage', function (actor) {
            return game.settings.get('lmrtfy', 'useTokenImageOnRequester');
        });

        Handlebars.registerHelper('lmrtfy-isdemonlord', function (actor) {
            return game.system.id === 'demonlord';
        });
    }

    static ready() {
        game.socket.on('module.lmrtfy', LMRTFY.onMessage);

        switch (game.system.id) {
            case 'dnd5eJP':
            case 'dnd5e':
            case 'sw5e':
                LMRTFY.saveRollMethod = 'rollAbilitySave';
                LMRTFY.abilityRollMethod = 'rollAbilityTest';
                LMRTFY.skillRollMethod = 'rollSkill';
                LMRTFY.abilities = LMRTFY.create5eAbilities();
                LMRTFY.skills = CONFIG.DND5E.skills;
                LMRTFY.saves = LMRTFY.create5eAbilities();
                LMRTFY.normalRollEvent = { shiftKey: true, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: true, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: true };
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': true };
                LMRTFY.abilityAbbreviations = LMRTFY.create5eAbilities();
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;

            case 'pf1':
                LMRTFY.saveRollMethod = 'rollSavingThrow';
                LMRTFY.abilityRollMethod = 'rollAbility';
                LMRTFY.skillRollMethod = 'rollSkill';
                LMRTFY.abilities = CONFIG.PF1.abilities;
                LMRTFY.skills = CONFIG.PF1.skills;
                LMRTFY.saves = CONFIG.PF1.savingThrows;
                LMRTFY.normalRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: true, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: true };
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': false, 'perception': false };
                LMRTFY.abilityAbbreviations = CONFIG.PF1.abilitiesShort;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;

            case 'pf2e':
                LMRTFY.saveRollMethod = 'rollSave';
                LMRTFY.abilityRollMethod = 'rollAbility';
                LMRTFY.skillRollMethod = 'rollSkill';
                LMRTFY.abilities = CONFIG.PF2E.abilities;
                LMRTFY.skills = CONFIG.PF2E.skills;
                LMRTFY.saves = CONFIG.PF2E.saves;
                LMRTFY.normalRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: true, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: true };
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': true, 'perception': true };
                LMRTFY.abilityAbbreviations = CONFIG.PF2E.abilities;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;

            case 'D35E':
                LMRTFY.saveRollMethod = 'rollSave';
                LMRTFY.abilityRollMethod = 'rollAbility';
                LMRTFY.skillRollMethod = 'rollSkill';
                LMRTFY.abilities = CONFIG.D35E.abilities;
                LMRTFY.skills = CONFIG.D35E.skills;
                LMRTFY.saves = CONFIG.D35E.savingThrows;
                LMRTFY.normalRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: true, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: true };
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': false, 'perception': true };
                LMRTFY.abilityAbbreviations = CONFIG.D35E.abilityAbbreviations;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;

            case 'cof':
                LMRTFY.saveRollMethod = 'rollStat';
                LMRTFY.abilityRollMethod = 'rollStat';
                LMRTFY.skillRollMethod = 'rollStat';
                LMRTFY.abilities = CONFIG.COF.stats;
                LMRTFY.skills = CONFIG.COF.skills;
                LMRTFY.normalRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.specialRolls = {};
                LMRTFY.abilityAbbreviations = CONFIG.COF.statAbbreviations;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;

            case 'coc':
                LMRTFY.saveRollMethod = 'rollStat';
                LMRTFY.abilityRollMethod = 'rollStat';
                LMRTFY.skillRollMethod = 'rollStat';
                LMRTFY.abilities = CONFIG.COC.stats;
                LMRTFY.skills = CONFIG.COC.skills;
                LMRTFY.normalRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.disadvantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.specialRolls = {};
                LMRTFY.abilityAbbreviations = CONFIG.COC.statAbbreviations;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;

            case 'demonlord':
                const abilities = duplicate(CONFIG.DL.attributes);
                delete abilities.defense;
                LMRTFY.saveRollMethod = 'rollChallenge';
                LMRTFY.abilityRollMethod = 'rollChallenge';
                LMRTFY.skillRollMethod = 'rollChallenge';
                LMRTFY.abilities = abilities;
                LMRTFY.skills = {};
                LMRTFY.saves = {};
                LMRTFY.normalRollEvent = {};
                LMRTFY.advantageRollEvent = {};
                LMRTFY.disadvantageRollEvent = {};
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': true, 'perception': true };
                LMRTFY.abilityAbbreviations = abilities;
                LMRTFY.modIdentifier = 'modifier';
                LMRTFY.abilityModifiers = {};
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;

            case 'ose':
                LMRTFY.saveRollMethod = 'rollSave';
                LMRTFY.abilityRollMethod = 'rollCheck';
                LMRTFY.skillRollMethod = 'rollExploration';
                LMRTFY.abilities = CONFIG.OSE.scores;
                LMRTFY.abilityAbbreviations = CONFIG.OSE.scores_short;
                LMRTFY.skills = CONFIG.OSE.exploration_skills;
                LMRTFY.saves = CONFIG.OSE.saves_long;
                LMRTFY.normalRollEvent = {};
                LMRTFY.advantageRollEvent = {};
                LMRTFY.disadvantageRollEvent = {};
                LMRTFY.specialRolls = {};
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;
            
            case 'foundry-chromatic-dungeons':
                LMRTFY.saveRollMethod = 'saveRoll';
                LMRTFY.abilityRollMethod = 'attributeRoll';
                LMRTFY.skillRollMethod = null;
                LMRTFY.abilities = CONFIG.CHROMATIC.attributeLabels;
                LMRTFY.abilityAbbreviations = CONFIG.CHROMATIC.attributeAbbreviations;
                LMRTFY.skills = {};
                LMRTFY.saves = CONFIG.CHROMATIC.saves;
                LMRTFY.specialRolls = {};
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;
                
            case 'degenesis':
                LMRTFY.skillRollMethod = 'rollSkill';
                let dskills = game.actors.contents[0]?.system.skills || {};
                for (const [key, value] of Object.entries(dskills)) {
                    dskills[key]["label"] = key;
                    dskills[key]["ability"] = value.attribute;
                }
                LMRTFY.skills = dskills;
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;
                
            case 'ffd20':
                LMRTFY.saveRollMethod = 'rollSavingThrow';
                LMRTFY.abilityRollMethod = 'rollAbilityTest';
                LMRTFY.skillRollMethod = 'rollSkill';
                LMRTFY.abilities = CONFIG.FFD20.abilities;
                LMRTFY.skills = CONFIG.FFD20.skills;
                LMRTFY.saves = CONFIG.FFD20.savingThrows;
                LMRTFY.normalRollEvent = { shiftKey: false, altKey: false, ctrlKey: false };
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': false, 'perception': false };
                LMRTFY.abilityAbbreviations = CONFIG.abilitiesShort;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                LMRTFY.canFailChecks = game.settings.get('lmrtfy', 'showFailButtons');
                break;

            case 'dcc':
                LMRTFY.saveRollMethod = 'rollSavingThrow';
                LMRTFY.abilityRollMethod = 'rollAbilityCheck';
                LMRTFY.skillRollMethod = 'rollSkillCheck';
                LMRTFY.abilities = CONFIG.DCC.abilities;
                LMRTFY.skills = {};
                LMRTFY.saves = CONFIG.DCC.saves;
                LMRTFY.normalRollEvent = { shiftKey: true, altKey: false, ctrlKey: false };
                LMRTFY.advantageRollEvent = { shiftKey: false, altKey: false, ctrlKey: true };
                LMRTFY.specialRolls = { 'initiative': true, 'deathsave': false, 'perception': false };
                LMRTFY.abilityAbbreviations = CONFIG.DCC.abilities;
                LMRTFY.modIdentifier = 'mod';
                LMRTFY.abilityModifiers = LMRTFY.parseAbilityModifiers();
                break;

            default:
                console.error('LMRTFY | Unsupported system detected');
        }

        if (game.system.id === "dnd5e") {
            LMRTFY.normalRollEvent = { fastForward: true };
            LMRTFY.advantageRollEvent = { advantage: true, fastForward: true };
            LMRTFY.disadvantageRollEvent = { disadvantage: true, fastForward: true };
        }

        LMRTFY.d20Svg = '<svg class="lmrtfy-dice-svg-normal" viewBox="0 0 64 64"><g transform="translate(-246.69456,-375.66745)"><path d="M278.2,382.1c-0.1,0-0.2,0-0.3,0.1L264.8,398c-0.2,0.3-0.2,0.3,0.1,0.3l26.4-0.1c0.4,0,0.4,0,0.1-0.3l-13-15.8C278.4,382.1,278.3,382.1,278.2,382.1L278.2,382.1z"/></g></svg>';

        if (game.modules.get("midi-qol")?.active && !isNewerVersion(game.modules.get("midi-qol")?.version, "10.0.26")) {
            LMRTFY.canFailChecks = false;
        }

        if (game.settings.get('lmrtfy', 'deselectOnRequestorRender')) {
            Hooks.on("renderLMRTFYRequestor", () => {
                canvas.tokens?.releaseAll();
            })
        }
    }

    static parseAbilityModifiers() {
        let abilityMods = {};
        for (let key in LMRTFY.abilities) {
            if (LMRTFY.abilityAbbreviations?.hasOwnProperty(key)) {
                abilityMods[`abilities.${game.i18n.localize(LMRTFY.abilityAbbreviations[key])}.${LMRTFY.modIdentifier}`] = game.i18n.localize(LMRTFY.abilities[key]);
            }
        }
        if (['dnd5eJP', 'dnd5e', 'sw5e'].includes(game.system.id)) {
            abilityMods['attributes.prof'] = 'DND5E.Proficiency';
        }
        return abilityMods;
    }
    
    static create5eAbilities() {
        let abbr = {};
        for (let [key, data] of Object.entries(CONFIG.DND5E.abilities)) { 
            let abb = game.i18n.localize(data.abbreviation);
            let upperFirstLetter = abb.charAt(0).toUpperCase() + abb.slice(1);
            abbr[key] = `DND5E.Ability${upperFirstLetter}`;
        }
        return abbr;
    }

    static onMessage(data) {
        if (data.user === "character" && (!game.user.character || !data.actors.includes(game.user.character.id))) return;
        if (!["character", "tokens"].includes(data.user) && data.user !== game.user.id) return;
        
        let actors = [];
        if (data.user === "character") {
            actors = [game.user.character];
        } else if (data.user === "tokens") {
            actors = canvas.tokens.controlled.map(t => t.actor).filter(a => data.actors.includes(a.id));
        } else {
            actors = data.actors.map(aid => LMRTFY.fromUuid(aid));
        }
        actors = actors.filter(a => a);
        if (game.user.isGM) actors = actors.filter(a => !a.hasPlayerOwner);
        if (actors.length === 0) return;
        new LMRTFYRoller(actors, data).render(true);
    }

    static requestRoll() {
        if (LMRTFY.requestor === undefined) LMRTFY.requestor = new LMRTFYRequestor();
        LMRTFY.requestor.render(true);
    }

    static onThemeChange(enabled) {
        $(".lmrtfy.lmrtfy-requestor,.lmrtfy.lmrtfy-roller").toggleClass("lmrtfy-parchment", enabled);
    }

    static getSceneControlButtons(controls) {
        const buttons = controls.controls || controls;
        if (!Array.isArray(buttons)) return;
        const tokenButton = buttons.find(b => b.name === "token");
        if (tokenButton) {
            tokenButton.tools.push({
                name: "request-roll",
                title: game.i18n.localize('LMRTFY.ControlTitle'),
                icon: "fas fa-dice-d20",
                visible: game.user.isGM,
                onClick: () => LMRTFY.requestRoll(),
                button: true
            });
        }
    }

    static buildAbilityModifier(actor, ability) {
        const modifiers = [];
        const abilityData = actor.system.abilities?.[ability];
        if (!abilityData) return null;
        const mod = game.pf2e.AbilityModifier.fromScore(ability, abilityData.value);
        modifiers.push(mod);
        [`${ability}-based`, 'ability-check', 'all'].forEach((key) => {
            (actor.synthetics?.statisticsModifier?.[key] || []).forEach((m) => modifiers.push(m.clone()));
        });
        return new game.pf2e.StatisticModifier(`${game.i18n.localize('LMRTFY.AbilityCheck')} ${game.i18n.localize(mod.label)}`, modifiers);
    }

    static async hideBlind(message, html, data) {
        html = $(html);
        if (message.flags?.lmrtfy?.blind && !game.user.isGM) {
            const content = '<p>??</p>';
            const messageDiv = html.find(".message-content");
            if (messageDiv.length) messageDiv.html(content);
        }
    }

    static fromUuid(uuid) {
        if (typeof fromUuidSync === "function") return fromUuidSync(uuid);
        let parts = uuid.split(".");
        let doc;
        if (parts.length === 1) return game.actors.get(uuid);
        if (parts[0] === "Compendium") return undefined;
        const collection = game.collections.get(parts[0]) || CONFIG[parts[0]]?.collection;
        doc = collection?.get(parts[1]);
        if (doc?.actor) doc = doc.actor;
        return doc || undefined;
    }
}

globalThis.LMRTFYRequestRoll = LMRTFY.requestRoll;
Hooks.once('init', LMRTFY.init);
Hooks.on('ready', LMRTFY.ready);
Hooks.on('getSceneControlButtons', (controls) => LMRTFY.getSceneControlButtons(controls));
Hooks.on('renderChatMessage', LMRTFY.hideBlind);
