class LMRTFYRequestor extends FormApplication {
    constructor(...args) {
        super(...args)
        game.users.apps.push(this);
        
        this.selectedDice = [];
        this.selectedModifiers = [];
        this.dice = [
            'd3',
            'd4',
            'd6',
            'd8',
            'd10',
            'd12',
            'd20',
            'd100'
        ];

        this.diceFormula = '';
        this.bonusFormula = '';
        this.modifierFormula = '';
    }

    static get defaultOptions() {

        let template;
        switch (game.system.id) {
            case "degenesis":
                template = "modules/lmrtfy/templates/degenesis-request-rolls.html";
                break;
            case "demonlord":
                template = "modules/lmrtfy/templates/demonlord-request-rolls.html";
                break;                
            default:
                template = "modules/lmrtfy/templates/request-rolls.html";
                break;
        }

        const options = super.defaultOptions;
        options.title = game.i18n.localize("LMRTFY.Title");
        options.id = "lmrtfy";
        options.template = template;
        options.closeOnSubmit = false;
        options.popOut = true;
        options.width = 600;
        options.height = "auto";
        options.classes = ["lmrtfy", "lmrtfy-requestor"];
        if (game.settings.get('lmrtfy', 'enableParchmentTheme')) {
          options.classes.push('lmrtfy-parchment');
        }
        return options;
    }

    async getData() {
        // Return data to the template
        // V13 FIX: Use .contents
        const actors = game.actors.contents;
        const users = game.users.contents;
        
        const abilities = LMRTFY.abilities;
        const saves = LMRTFY.saves;
        const abilityModifiers = LMRTFY.abilityModifiers;

        // V13/5e FIX: Ensure skill labels are strings. D&D 5e 3.x+ uses objects.
        // Added safety check for 'label' and 'localize' to prevent key.split error.
        const skills = Object.keys(LMRTFY.skills)
            .sort((a, b) => {
                const skillAObj = LMRTFY.skills[a];
                const skillBObj = LMRTFY.skills[b];
                const labelA = (skillAObj?.label) ? skillAObj.label : (typeof skillAObj === 'string' ? skillAObj : a);
                const labelB = (skillBObj?.label) ? skillBObj.label : (typeof skillBObj === 'string' ? skillBObj : b);
                return game.i18n.localize(labelA).localeCompare(game.i18n.localize(labelB));
            })
            .reduce((acc, skillKey) => {
                const skillObj = LMRTFY.skills[skillKey];
                const skillLabel = (skillObj?.label) ? skillObj.label : (typeof skillObj === 'string' ? skillObj : skillKey);
                acc[skillKey] = skillLabel;
                return acc;
            }, {});

        let tables = null;
        if (game.tables) {
            tables = [];
            game.tables.forEach(
                t => tables.push(t.name)
            );
        }

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

    render(force, context={}) {
        // Only re-render if needed
        const {action, data} = context;
        if (action && !["create", "update", "delete"].includes(action)) return;
        if (action === "update" && !data.some(d => "character" in d)) return;
        if (force !== true && !action) return;
        return super.render(force, context);
    }
    
    activateListeners(html) {
        super.activateListeners(html);
        // V13 Safety wrapper
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
        if ((game.system.id) === "demonlord") html.find(".demonlord").change(this.clearDemonLordSettings.bind(this));        
        this._onUserChange();
    }

    setActorSelection(event, enabled) {
        event.preventDefault();
        this.element.find(".lmrtfy-actor input").prop("checked", enabled)
    }

    _onHoverActor(event) {
        event.preventDefault();
        const div = event.currentTarget;

        // Remove any existing tooltip
        const tooltip = div.querySelector(".tooltip");
        if (tooltip) div.removeChild(tooltip);

        // Handle hover-in
        if (event.type === "mouseenter") {
            const userId = this.element.find("select[name=user]").val();
            const actorId = div.dataset.id;
            const actor = game.actors.get(actorId);
            if (!actor) return;
            const gameUsers = game.users.contents;
            const user = userId === "character" ? gameUsers.find(u => u.character && u.character.id === actor.id) : null;
            const tooltip = document.createElement("SPAN");
            tooltip.classList.add("tooltip");
            tooltip.textContent = `${actor.name}${user ? ` (${user.name})` : ''}`;
            div.appendChild(tooltip);
        }
    }

    _getUserActorIds(userId) {
        let actors = [];
        if (userId === "character") {
            const gameUsers = game.users.contents;
            actors = gameUsers.map(u => u.character?.id).filter(a => a)
        } else if (userId === "tokens") {
            actors = Array.from(new Set(canvas.tokens.controlled.map(t => t.actor?.id))).filter(a => a);
        } else {
            const user = game.users.get(userId);
            if (user) {
                const gameActors = game.actors.contents;
                // V13 FIX: check permission method
                actors = gameActors.filter(a => a.testUserPermission(user, "OWNER")).map(a => a.id)
            }
        }
        return actors;
    }

    _onUserChange() {
        const userId = this.element.find("select[name=user]").val();
        const actors = this._getUserActorIds(userId)
        this.element.find(".lmrtfy-actor").hide().filter((i, e) => actors.includes(e.dataset.id)).show();

        if (userId === 'selected') {
            this.element.find(".lmrtfy-request-roll").hide();
        } else {
            this.element.find(".lmrtfy-request-roll").show();
        }
    }

    diceLeftClick(event) {
        this.selectedDice.push(event?.currentTarget?.dataset?.value);
        this.diceFormula = this.convertSelectedDiceToFormula();

        this.combineFormula();
    }

    diceRightClick(event) {
        const index = this.selectedDice.indexOf(event?.currentTarget?.dataset?.value);

        if (index > -1) {
            this.selectedDice.splice(index, 1);
        }
        this.diceFormula = this.convertSelectedDiceToFormula();

        this.combineFormula();
    }

    bonusClick(event) {
        let bonus = event?.currentTarget?.dataset?.value;
        let newBonus = +(this.bonusFormula.trim().replace(' ', '')) + +bonus;
        
        if (newBonus === 0) {
            this.bonusFormula = '';
        } else {
            this.bonusFormula = ((newBonus > 0) ? ' + ' : ' - ') + Math.abs(newBonus).toString();
        }

        this.combineFormula();
    }

    modifierClick(event) {
        let checked = event?.currentTarget?.checked;

        if (checked) {
            this.selectedModifiers.push(event?.currentTarget?.dataset?.value)
        } else {
            const index = this.selectedModifiers.indexOf(event?.currentTarget?.dataset?.value);
            this.selectedModifiers.splice(index, 1);
        }
        
        this.modifierFormula = this.convertSelectedModifiersToFormula();
        this.combineFormula();
    }

    convertSelectedDiceToFormula() {
        const occurences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0);
        let formula = '';

        if (!this.selectedDice?.length) {
            return '';
        }

        for (let die of this.dice) {
            let count = occurences(this.selectedDice, die);

            if (count > 0) {
                if (formula?.length) {
                    formula += ' + ';
                }

                formula += count + die;
            }            
        }

        return formula;        
    }

    convertSelectedModifiersToFormula() {
        let formula = '';

        if (!this.selectedModifiers?.length) {
            return '';
        }

        for (let mod of this.selectedModifiers) {
            if (formula?.length) {
                formula += ' + ';
            }

            formula += `@${mod}`;
        }

        return formula;        
    }

    combineFormula() {
        let customFormula = '';
        if (this.diceFormula?.length) {
            customFormula += this.diceFormula;

            if (this.modifierFormula?.length) {
                customFormula += ` + ${this.modifierFormula}`;
            }

            if (this.bonusFormula?.length) {
                customFormula += this.bonusFormula;
            }            
        } else {
            this.element.find(".custom-formula").val('');
        }

        if (customFormula?.length) {
            this.element.find(".custom-formula").val(customFormula);
        }
    }

    clearCustomFormula() {
        this.diceFormula = '';
        this.modifierFormula = '';
        this.bonusFormula = '';
        this.selectedDice = [];
        this.selectedModifiers = [];
        this.element.find(".lmrtfy-formula-ability").prop('checked', false);

        this.combineFormula();
    }

    clearDemonLordSettings() {
        if (($("#advantage").val() === "-1") || ($("#advantage").val() === "1")) {
            $("#boonsBanes").prop('disabled', false);
            $("#additionalModifier").prop('disabled', false);
        } else {
            $("#additionalModifier").val("0");
            $("#boonsBanes").val("0");
            $("#boonsBanes").prop('disabled', true);
            $("#additionalModifier").prop('disabled', true);
        }
    }

    async _updateObject(event, formData) {
        const saveAsMacro = $(event.currentTarget).hasClass("lmrtfy-save-roll")
        const keys = Object.keys(formData)
        const user_actors = this._getUserActorIds(formData.user).map(id => `actor-${id}`);
        const actors = keys.filter(k => k.startsWith("actor-")).reduce((acc, k) => {
            if (formData[k] && user_actors.includes(k)) 
                acc.push(k.slice(6));
            return acc;
        }, []);
        const abilities = keys.filter(k => k.startsWith("check-")).reduce((acc, k) => {
            if (formData[k])
                acc.push(k.slice(6));
            return acc;
        }, []);
        const saves = keys.filter(k => k.startsWith("save-")).reduce((acc, k) => {
            if (formData[k])
                acc.push(k.slice(5));
            return acc;
        }, []);
        const skills = keys.filter(k => k.startsWith("skill-")).reduce((acc, k) => {
            if (formData[k])
                acc.push(k.slice(6));
            return acc;
        }, []);
        const tables = formData.table;
        const formula = formData.formula.trim();
        const { advantage, mode, title, message } = formData;

        if (formData.user === 'selected' && !saveAsMacro) {
            ui.notifications.warn(game.i18n.localize("LMRTFY.SelectedNotification"));
            return;
        }

        if ((actors.length === 0 && formData.user !== 'selected') ||
             (
                !message &&
                abilities.length === 0 && saves.length === 0 && skills.length === 0 &&
                formula.length === 0 && 
                !formData['extra-death-save'] && !formData['extra-initiative'] && !formData['extra-perception'] &&
                tables?.length === 0
            )
        ) {
            ui.notifications.warn(game.i18n.localize("LMRTFY.NothingNotification"));
            return;
        }

        let dc = undefined;
        if (game.system.id === 'pf2e') {
            if (Number.isInteger(parseInt(formData.dc))) {
                dc = {
                    value: parseInt(formData.dc),
                    visibility: formData.visibility
                }
            }
        }

        let boonsBanes = undefined;
        let additionalModifier = undefined;
        if (game.system.id === 'demonlord') {
            boonsBanes = formData.boonsBanes;
            additionalModifier = formData.additionalModifier;
        }
    
        const socketData = {
            user: formData.user,
            actors,
            abilities,
            saves,
            skills,
            advantage,
            mode,
            title,
            message,
            formula,
            deathsave: formData['extra-death-save'],
            initiative: formData['extra-initiative'],
            perception: formData['extra-perception'],
            tables: tables,
            chooseOne: formData['choose-one'],
            canFailChecks: LMRTFY.canFailChecks,
        }
        if (game.system.id === 'pf2e' && dc) {
            socketData['dc'] = dc;
        }
        if (game.system.id === 'demonlord') {
            socketData['boonsBanes'] = boonsBanes;
            socketData['additionalModifier'] = additionalModifier;            
        }
        
        if (saveAsMacro) {
            let selectedSection = '';
            if (socketData.user === 'selected') {
                selectedSection = `// Handle selected user\n` +
                    `if (data.user === "selected") {\n` +
                    `    if (!canvas.tokens?.controlled?.length) {\n` +
                    `      ui.notifications.warn(game.i18n.localize("LMRTFY.NoSelectedToken"));\n` +
                    `      return;\n` +
                    `    }\n\n` +
                    `    data.actors = canvas.tokens.controlled.map(t => t.actor.id);\n` +
                    `    data.user = "tokens";\n` +
                    `}\n\n`;
            }

            const actorTargets = actors.map(a => game.actors.get(a)).filter(a => a).map(a => a.name).join(", ");
            const user = game.users.get(formData.user) || null;
            const target = user ? user.name : actorTargets;
            const scriptContent = `// ${title} ${message ? " -- " + message : ""}\n` +
                `// Request rolls from ${target}\n` +
                `// Abilities: ${abilities.map(a => {
                    const label = LMRTFY.abilities[a];
                    return (label?.label) ? label.label : label;
                }).filter(s => s).join(", ")}\n` +
                `// Saves: ${saves.map(a => {
                    const label = LMRTFY.saves[a];
                    return (label?.label) ? label.label : label;
                }).filter(s => s).join(", ")}\n` +
                `// Skills: ${skills.map(s => {
                    const label = LMRTFY.skills[s];
                    return (label?.label) ? label.label : label;
                }).filter(s => s).join(", ")}\n` +
                `const data = ${JSON.stringify(socketData, null, 2)};\n\n` +
                `${selectedSection}` +
                `game.socket.emit('module.lmrtfy', data);\n`;
            const macro = await Macro.create({
                name: "LMRTFY: " + (message || title),
                type: foundry.CONST.MACRO_TYPES.SCRIPT,
                scope: "global",
                command: scriptContent,
                img: "icons/svg/d20-highlight.svg"
            });
            macro.sheet.render(true);
        } else {
            game.socket.emit('module.lmrtfy', socketData);
            // Send to ourselves
            LMRTFY.onMessage(socketData);
            ui.notifications.info(game.i18n.localize("LMRTFY.SentNotification"))
        }
    }
}

window.LMRTFYRequestor = LMRTFYRequestor;
