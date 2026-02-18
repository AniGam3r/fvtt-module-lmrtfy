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
            if (!canvas.ready) return false;
            const actorsControlledToken = canvas.tokens?.controlled.find(t => t.actor?.id === actor.id);
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

            default:
                console.warn('LMRFTY | System not explicitly tuned, using defaults');
        }

        if (game.system.id === "dnd5e") {
            LMRTFY.normalRollEvent = { fastForward: true };
            LMRTFY.advantageRollEvent = { advantage: true, fastForward: true };
            LMRTFY.disadvantageRollEvent = { disadvantage: true, fastForward: true };
        }

        LMRTFY.d20Svg = `<svg class="lmrtfy-dice-svg-normal" viewBox="0 0 64 64"><g transform="translate(-246.69456,-375.66745)"><path d="M278.2,382.1c-0.1,0-0.2,0-0.3,0.1L264.8,398c-0.2,0.3-0.2,0.3,0.1,0.3l26.4-0.1c0.4,0,0.4,0,0.1-0.3l-13-15.8C278.4,382.1,278.3,382.1,278.2,382.1z"/></g></svg>`;

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
        if (['dnd5e', 'sw5e'].includes(game.system.id)) {
            abilityMods['attributes.prof'] = 'DND5E.Proficiency';
        }
        return abilityMods;
    }

    static create5eAbilities() {
        let abbr = {};
        for (let key in CONFIG.DND5E.abilities) {
            let abb = game.i18n.localize(CONFIG.DND5E.abilities[key].abbreviation);
            let upperFirstLetter = abb.charAt(0).toUpperCase() + abb.slice(1);
            abbr[`${abb}`] = `DND5E.Ability${upperFirstLetter}`;
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
        if (!LMRTFY.requestor) LMRTFY.requestor = new LMRTFYRequestor();
        LMRTFY.requestor.render(true);
    }

    static onThemeChange(enabled) {
        $(".lmrtfy.lmrtfy-requestor,.lmrtfy.lmrtfy-roller").toggleClass("lmrtfy-parchment", enabled);
    }

    static getSceneControlButtons(controls) {
        // V13 Hook Adjustment
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
        // V13 System Data Path
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
        // V13 Native Element Wrapper
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
Hooks.on('getSceneControlButtons', LMRTFY.getSceneControlButtons);
Hooks.on('renderChatMessage', LMRTFY.hideBlind);
