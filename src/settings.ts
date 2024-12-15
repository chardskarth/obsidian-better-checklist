import { App, PluginSettingTab, Setting, TextComponent, ButtonComponent, sanitizeHTMLToDom } from 'obsidian'

import type TodoPlugin from './main'
import type { ChecklistFilter, GroupByType, LookAndFeel, SortDirection, TodoSettings } from './_types'
import { GroupBy } from './_types'
import { enumKeys } from './utils'

export const DEFAULT_SETTINGS: TodoSettings = {
	todoPageName: 'todo',
	showChecked: false,
	showAllTodos: false,
	autoRefresh: true,
	subGroups: false,
	groupBy: 'page',
	sortDirectionItems: 'new->old',
	sortDirectionGroups: 'new->old',
	sortDirectionSubGroups: 'new->old',
	includeFiles: '',
	lookAndFeel: 'classic',
	_collapsedSections: [],
	_hiddenTags: [],
	checklistFilters: [],
	selectedChecklistFilter: ""
}

const DEFAULT_CHECKLIST_FILTER: ChecklistFilter = {
	filterName: "",
	minimatchFileNames: "",
	limitTodos: 3,
	todosMatch: "",
	groupBy: GroupBy.PageOnly,
	enabled: true,
}

export class TodoSettingTab extends PluginSettingTab {
	filterRegion: HTMLElement;

	constructor(
		app: App,
		private plugin: TodoPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty()

		this.containerEl.createEl('h3', {
			text: 'Better Checklist Settings',
		})

		this.buildSettings()
	}

	private buildSettings() {
		this.containerEl.addClass("better-checklist-settings-tab")
		this.buildAddFilter()
		this.buildFilterSettingRegion()
		this.refreshFilterSettingRegion(true)

		this.containerEl.createEl("h4", {
			text: "General Settings"
		})

		new Setting(this.containerEl)
			.setName('Look and Feel')
			.addDropdown(dropdown => {
				dropdown.addOption('classic', 'Classic')
				dropdown.addOption('compact', 'Compact')
				dropdown.setValue(this.plugin.getSettingValue('lookAndFeel'))
				dropdown.onChange(async (value: LookAndFeel) => {
					await this.plugin.updateSettings({ lookAndFeel: value })
				})
			})

		new Setting(this.containerEl)
			.setName('Auto Refresh List?')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.getSettingValue('autoRefresh'))
				toggle.onChange(async value => {
					await this.plugin.updateSettings({ autoRefresh: value })
				})
			})
			.setDesc(
				'It\'s recommended to leave this on unless you are expereince performance issues due to a large vault. You can then reload manually using the "Checklist: refresh" command',
			)
	}

	private buildAddFilter() {
		const thisSetting = new Setting(this.containerEl)
		let textFilterName: TextComponent
		let addFilterButton: ButtonComponent

		thisSetting.setName('Create a Filter')
			.setDesc('Name your filter')
			.addText(text => text
				.setPlaceholder("Filter Name (e.g Next Actions / Waiting For)")
				.onChange(text => {
					addFilterButton.setDisabled(!text || !!this.getChecklistFilter(text))
				})
				.then(text => textFilterName = text)
			)
			.addButton(button =>
				button
					.setButtonText("Add Filter")
					.setDisabled(true) // this will enable on text.onChange
					.setCta()
					.onClick(() => {
						this.addNewChecklistFilter(textFilterName.getValue())
						textFilterName.setValue("")
						addFilterButton.setDisabled(true)
					})
					.then(btn => addFilterButton = btn)
			)
	}

	private getChecklistFilter(filterName: string) {
		return this.getChecklistFilters().find(x => x.filterName === filterName)
	}

	private getChecklistFilters(): ChecklistFilter[] {
		return this.plugin.getChecklistFilters()
	}


	private addNewChecklistFilter(filterName: string) {
		const previousFilterName = this.getChecklistFilter(filterName)

		if (previousFilterName) {
			return
		}

		const newFilter = this.createNewFilterFromName(filterName)
		this.addNewFilterInSettings(newFilter)
		this.refreshFilterSettingRegion()
	}

	private createNewFilterFromName(filterName: string): ChecklistFilter {
		return {
			...DEFAULT_CHECKLIST_FILTER,
			filterName,
		}
	}

	private addNewFilterInSettings(newFilter: ChecklistFilter) {
		let selectedChecklistFilter = this.plugin.getSettingValue("selectedChecklistFilter")
		if(!selectedChecklistFilter) {
			selectedChecklistFilter = newFilter.filterName
		}

		this.plugin.updateSettings({
			selectedChecklistFilter,
			checklistFilters: [
				newFilter,
				...this.getChecklistFilters()
			]
		})
	}

	private refreshFilterSettingRegion(skipRefreshView = false) {
		this.filterRegion.empty()
		const filters = this.getChecklistFilters().filter(x => x)

		const isUpperOrLowerLimit = (index: number) => {
			if (index === 0) return "lower"
			else if (index === filters.length - 1) return "upper"
			return "no"
		}

		this.updateChecklistFilters(filters, skipRefreshView)
		filters
			.forEach((filter, ii) => this.addFilterRegionSetting(filter, isUpperOrLowerLimit(ii)))
	}

	private addFilterRegionSetting(filter: ChecklistFilter, limit: "upper" | "lower" | "no") {
		const detailsContainer = this.filterRegion.createEl('details', {
			cls: 'checklist-filter',
			attr: {},
		});
		// detailsContainer.empty();

		const summary = detailsContainer
			.createEl('summary');

		summary.addClass("summaryHeading");

		new Setting(summary).setHeading().setName(filter.filterName);

		const divControls = summary.createDiv("checklist-filter-controls")
		if (limit !== "upper") {
			divControls.createDiv('icon').createDiv('movedown')
				.addEventListener('click', (pointerEvent: PointerEvent) => {
					const filterName = pointerEvent.target.closest("summary").querySelector(".setting-item:first-child .setting-item-name:first-child").innerText
					this.moveFilterUpOrDown(filterName, "down")
					pointerEvent.preventDefault()
				});
		}

		if (limit !== "lower") {
			divControls.createDiv('icon').createDiv('moveup')
				.addEventListener('click', (pointerEvent: PointerEvent) => {
					const filterName = pointerEvent.target.closest("summary").querySelector(".setting-item:first-child .setting-item-name:first-child").innerText
					this.moveFilterUpOrDown(filterName, "up")
					pointerEvent.preventDefault()
				});
		}

		const checkboxContainer = divControls.createDiv('checkbox-container');
		checkboxContainer.addEventListener('click', (pointerEvent: PointerEvent) => {
			const filterName = pointerEvent.target.closest("summary").querySelector(".setting-item:first-child .setting-item-name:first-child").innerText
			const checkboxInput = pointerEvent.currentTarget.querySelector("input")
			checkboxInput.checked = !checkboxInput.checked
			if (checkboxInput.checked) {
				pointerEvent.target.classList.add('is-enabled')
			} else {
				pointerEvent.target.classList.remove('is-enabled')
			}

			this.setChecklistFilterToggle(filterName, checkboxInput.checked)

			pointerEvent.preventDefault()
		});


		const checkboxInput = checkboxContainer.createEl('input', {
			attr: {
				type: 'checkbox'
			}
		})

		if (filter.enabled) {
			setTimeout(function() {
				checkboxInput.checked = true
				checkboxContainer.classList.add('is-enabled')
			})
		}

		divControls.createDiv('icon').createDiv('delete')
			.addEventListener('click', (pointerEvent: PointerEvent) => {
				const filterName = pointerEvent.target.closest("summary").querySelector(".setting-item:first-child .setting-item-name:first-child").innerText
				this.deleteChecklistFilter(filterName)
				pointerEvent.preventDefault()
			});
		divControls.createDiv('icon').createDiv('handle');

		new Setting(detailsContainer)
			.setName('Filter Name')
			.addText(text => text
				.setValue(filter.filterName)
			)

		new Setting(detailsContainer)
			.setName('Include Files')
			.setDesc(
				sanitizeHTMLToDom(
					'Include all files that matches this dataview pages query. See <a href="https://blacksmithgu.github.io/obsidian-dataview/#data-querying">Dataview JS Query</a>.',
				)
			)
			.setTooltip('**/*')
			.addTextArea(text => text
				.setValue(filter.minimatchFileNames)
			)

		new Setting(detailsContainer)
			.setName('Tag name')
			.setDesc(
				'e.g. "todo" will match #todo. You can also negate a match (e.g. -waitingfor will remove tasks with #waitingfor). You may add multiple tags separated by a newline. Leave empty to capture all',
			)
			.addTextArea(text =>
				text
					.setPlaceholder('todo')
					.setValue(filter.todosMatch)
			)

		new Setting(detailsContainer)
			.setName("Limit Todos")
			.setDesc(
				"This will limit the number of tasks per group. Leave empty or set to zero to display all tasks."
			)
			.addText(text =>
				text
					.setValue(filter.limitTodos.toString())
			)

		new Setting(detailsContainer).setName('Group By').addDropdown(dropdown => {
			Object.values(GroupBy)
				.filter(x => isNaN(Number(x)))
				.forEach(key => {
					dropdown.addOption(key, key)
				})
			dropdown.setValue(filter.groupBy)
		})

		const getQuerySelector = (target: EventTarget) => (query: string): HTMLElement =>
			(target as HTMLElement).closest('.checklist-filter').querySelector(query)

		new Setting(detailsContainer).addButton(button => button
			.setButtonText("Save")
			.onClick(event => {

				const querySelector = getQuerySelector(event.target)
				const filterName = querySelector(".summaryHeading .setting-item .setting-item-name").innerText

				const newFilterName = (querySelector('.setting-item:nth-child(2) input[type=text]') as HTMLInputElement).value

				const minimatchFileNames = (querySelector('.setting-item:nth-child(3) textarea') as HTMLInputElement).value

				const todosMatch = (querySelector('.setting-item:nth-child(4) textarea') as HTMLInputElement).value

				const limitTodos = (querySelector('.setting-item:nth-child(5) input[type=text]') as HTMLInputElement).value

				const groupBy = (querySelector('.setting-item:nth-child(6) select') as HTMLInputElement).value

				const newChecklistFilters = this.getUpdatedChecklistFilters(filterName, {
					filterName: newFilterName,
					minimatchFileNames,
					limitTodos: Number(limitTodos),
					todosMatch,
					groupBy: groupBy as `${GroupBy}`,
					enabled: filter.enabled
				})

				let selectedChecklistFilter = this.plugin.getSettingValue("selectedChecklistFilter")
				if (filterName === selectedChecklistFilter) {
					selectedChecklistFilter = newFilterName
					querySelector(".summaryHeading .setting-item .setting-item-name").textContent = newFilterName
				}

				this.plugin.updateSettings({
					checklistFilters: newChecklistFilters,
					selectedChecklistFilter,
				})

				event.target.closest("details").classList.add("animate__animated", "animate__flash")
				event.target.closest("details").querySelector("summary").click()

				setTimeout(() => {
					event.target.closest("details").classList.remove("animate__animated", "animate__flash")
				}, 1100)

			})
			.setCta()
		)
	}


	private moveFilterUpOrDown(filterName: string, direction: "up" | "down") {
		const indexOfFilter = this.getChecklistFilterIndex(filterName)
		if (indexOfFilter < 0) {
			console.error(`Unexpected: Cannot find filterName: ${filterName}`)
			return;
		}

		this.updateChecklistFilters(
			this.getChecklistFilters().map((_, ii, filters) => {
				if (direction == "up" && indexOfFilter == 0 || direction == "down" && indexOfFilter == filters.length - 1)
					return filters[ii]
				else if (direction == "up" && ii == indexOfFilter - 1)
					return filters[indexOfFilter]
				else if (direction == "up" && ii == indexOfFilter)
					return filters[indexOfFilter - 1]
				else if (direction == "down" && ii == indexOfFilter + 1)
					return filters[indexOfFilter]
				else if (direction == "down" && ii == indexOfFilter)
					return filters[indexOfFilter + 1]
				else
					return filters[ii]
			})
		)

		this.refreshFilterSettingRegion()
	}

	private getChecklistFilterIndex(filterName: string) {
		return this.getChecklistFilters().findIndex(x => x.filterName === filterName)
	}

	private deleteChecklistFilter(filterName: string) {
		const checklistFilter = this.getChecklistFilter(filterName)
		if (!checklistFilter) {
			console.error(`Unexpected: Cannot find filterName: ${filterName}`)
			return;
		}

		this.updateChecklistFilters(
			this.getChecklistFilters().filter(checklistFilter => checklistFilter.filterName !== filterName)
		)
		this.refreshFilterSettingRegion()
	}

	private setChecklistFilterToggle(filterName: string, enabled: boolean) {
		const checklistFilters = this.getChecklistFilters()
		let selectedChecklistFilter = this.plugin.getSettingValue("selectedChecklistFilter")

		const newChecklistFilters = checklistFilters.map(x => {
			if (x.filterName === filterName) {
				return { ...x, enabled }
			} else {
				return x
			}
		})

		if (filterName === selectedChecklistFilter && !enabled) {
			selectedChecklistFilter = newChecklistFilters
				.filter(x => x.enabled)?.[0]?.filterName ?? null
		}

		this.plugin.updateSettings({
			selectedChecklistFilter,
			checklistFilters: newChecklistFilters
		}, false)
	}

	private updateChecklistFilters(
		checklistFilters: ChecklistFilter[],
		skipRefreshView = false
	) {
		this.plugin.updateSettings({
			checklistFilters
		}, skipRefreshView)
	}

	private buildFilterSettingRegion() {
		this.containerEl.createEl("h4", {
			text: "Checklist Filters",
			cls: 'bottomBorderHeading',
		})

		this.filterRegion = this.containerEl.createEl("div")
	}

	private getUpdatedChecklistFilters(filterName: string, checklistFilter: ChecklistFilter) {
		const filters = this.getChecklistFilters()
		const indexOfFilterToUpdate = filters.findIndex(x => x.filterName === filterName)

		return filters.map((filter, ii) => {
			if (ii == indexOfFilterToUpdate)
				return checklistFilter
			else
				return filter
		})
	}
}
