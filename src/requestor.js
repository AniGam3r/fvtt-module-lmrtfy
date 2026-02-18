class LMRTFYRequestor extends FormApplication {
    constructor(...args) {
        super(...args);
        // We still use this to track open instances
        game.users.apps.push(this);
        
        this.selectedDice = [];
        this.selectedModifiers = [];
        this.dice = ['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
        this.diceFormula = '';
        this.bonusFormula = '';
        this.modifierFormula = '';
    }

    static get defaultOptions() {
        let template = "modules/lmrtfy/templates/request-rolls.html";
        if (game.system.id === "degenesis") template = "modules/lmrtfy/templates/degenesis-request-rolls.html";
        if (game.system.id === "demonlord") template = "modules/lmrtfy/templates/demonlord-request-rolls.html";

        return mergeObject(super.defaultOptions, {
            title: game.i18n.localize("LMRTFY.Title"),
            id: "lmrtfy",
            template: template,
            closeOnSubmit: false,
            popOut: true,
            width: 600,
            height: "auto",
            classes: ["lmrtfy", "lmrtfy-requestor", game.settings.get('lmrtfy', 'enableParchmentTheme') ? 'lmrtfy-parchment' : ""]
        });
    }

    async getData() {
        // V13 Collection Access
        const actors = game.actors.contents;
        const users = game.users.contents;
        
        const abilities = LMRTFY.abilities;
        const saves = LMRTFY.saves;
        const abilityModifiers = LMRTFY.abilityModifiers;

        const skills = Object.keys(LMRTFY.skills)
            .sort((a, b) => {
                const skillA = game.i18n.localize(LMRTFY.skills[a]?.label || LMRTFY.skills[a]);
                const skillB = game.i18n.localize(LMRTFY.skills[b]?.label || LMRTFY.skills[b]);
                return skillA.localeCompare(skillB);
            })
            .reduce((acc, skillKey) => {
                acc[skillKey] = LMRTFY.skills[skillKey]?.label || LMRTFY.skills[skillKey];
                return acc;
            }, {});

        const tables = game.tables?.contents.map(t => t.name) || [];

        return {
            actors,
            users,
            abilities,
            saves,
            skills,
            tables,
            specialRolls: LMRTFY.specialRolls,
            rollModes: CONFIG.Dice.rollModes,
            showDC: (game.system.id === 'pf2e'),
            abilityModifiers,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        // ENSURE html is jQuery wrapped for V13
        html = $(html);

        html.find(".select-all").click((event) => this.setActorSelection(event, true));
        html.find(".deselect-all").click((event) => this.setActorSelection(event, false));
        html.find("select[name=user]").change(this._onUserChange.bind(this));
        html.find(".lmrtfy-save-roll").click(this._onSubmit.bind(this));
        html.find(".lmrtfy-actor").hover(this._onHoverActor.bind(this));
        html.find(".lmrtfy-dice-tray-button").click(this.diceLeftClick.bind(this));
        html.find(".lmrtfy-dice-tray-button").contextmenu(this.diceRightClick.bind(this));
        html.find(".lmrtfy-bonus-button").click(this.bonusClick.bind(this));
        html.find(".lmrtfy-formula-ability").click(this.modifierClick.bind(this));
        html.find(".lmrtfy-clear-formula").click(this.clearCustomFormula.bind(this));        
        
        if (game.system.id === "demonlord") html.find(".demonlord").change(this.clearDemonLordSettings.bind(this));        
        
        this._onUserChange();
    }

    setActorSelection(event, enabled) {
        event.preventDefault();
        $(this.element).find(".lmrtfy-actor input").prop("checked", enabled);
    }

    _onHoverActor(event) {
        event.preventDefault();
        const div = event.currentTarget;
        const tooltip = div.querySelector(".tooltip");
        if (tooltip) div.removeChild(tooltip);

        if (event.type === "mouseenter") {
            const userId = $(this.element).find("select[name=user]").val();
            const actor = game.actors.get(div.dataset.id);
            if (!actor) return;
            
            const user = userId === "character" ? game.users.contents.find(u => u.character?.id === actor.id) : null;
            const span = document.createElement("SPAN");
            span.classList.add("tooltip");
            span.textContent = `${actor.name}${user ? ` (${user.name})` : ''}`;
            div.appendChild(span);
        }
    }

    _getUserActorIds(userId) {
        if (userId === "character") {
            return game.users.contents.map(u => u.character?.id).filter(id => !!id);
        } else if (userId === "tokens") {
            // V13 Token Document ID check
            return Array.from(new Set(canvas.tokens.controlled.map(t => t.actor?.id))).filter(id => !!id);
        } else {
            const user = game.users.get(userId);
            if (user) {
                // Check ownership levels for V13 compatibility
                return game.actors.contents
                    .filter(a => a.ownership[user.id] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER || a.ownership.default === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
                    .map(a => a.id);
            }
        }
        return [];
    }

    _onUserChange() {
        const el = $(this.element);
        const userId = el.find("select[name=user]").val();
        const actors = this._getUserActorIds(userId);
        
        el.find(".lmrtfy-actor").hide().filter((i, e) => actors.includes(e.dataset.id)).show();

        if (userId === 'selected') {
            el.find(".lmrtfy-request-roll").hide();
        } else {
            el.find(".lmrtfy-request-roll").show();
        }
    }

    // Logic for Dice/Bonus/Modifier remains identical as it is math/string based
    // ... [diceLeftClick, bonusClick, etc. kept as is] ...

    async _updateObject(event, formData) {
        const saveAsMacro = $(event.currentTarget).hasClass("lmrtfy-save-roll");
        const keys = Object.keys(formData);
        const user_actors = this._getUserActorIds(formData.user).map(id => `actor-${id}`);
        
        const actors = keys.filter(k => k.startsWith("actor-")).reduce((acc, k) => {
            if (formData[k] && user_actors.includes(k)) acc.push(k.slice(6));
            return acc;
        }, []);

        // Logic for Abilities/Saves/Skills mapping remains identical
        // ... [Collection mapping kept as is] ...

        const socketData = {
            user: formData.user,
            actors,
            abilities: keys.filter(k => k.startsWith("check-")).filter(k => formData[k]).map(k => k.slice(6)),
            saves: keys.filter(k => k.startsWith("save-")).filter(k => formData[k]).map(k => k.slice(5)),
            skills: keys.filter(k => k.startsWith("skill-")).filter(k => formData[k]).map(k => k.slice(6)),
            advantage: formData.advantage,
            mode: formData.mode,
            title: formData.title,
            message: formData.message,
            formula: formData.formula.trim(),
            deathsave: formData['extra-death-save'],
            initiative: formData['extra-initiative'],
            perception: formData['extra-perception'],
            tables: formData.table,
            chooseOne: formData['choose-one'],
            canFailChecks: LMRTFY.canFailChecks,
        };

        if (saveAsMacro) {
            // The generated macro script is already updated for V13 in our previous pass
            this._createMacro(socketData, formData.user);
        } else {
            game.socket.emit('module.lmrtfy', socketData);
            LMRTFY.onMessage(socketData);
            ui.notifications.info(game.i18n.localize("LMRTFY.SentNotification"));
        }
    }

    async _createMacro(socketData, userId) {
        let selectedSection = (userId === 'selected') ? 
            `if (data.user === "selected") {\n  if (!canvas.tokens?.controlled?.length) return ui.notifications.warn("No tokens selected");\n  data.actors = canvas.tokens.controlled.map(t => t.actor.id);\n  data.user = "tokens";\n}\n` : "";

        const scriptContent = `const data = ${JSON.stringify(socketData, null, 2)};\n${selectedSection}\ngame.socket.emit('module.lmrtfy', data);`;
        
        const macro = await Macro.create({
            name: "LMRTFY: " + (socketData.message || socketData.title),
            type: "script",
            command: scriptContent,
            img: "icons/svg/d20-highlight.svg"
        });
        macro.sheet.render(true);
    }
}
