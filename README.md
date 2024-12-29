Heavily inspired by [obsidian-checklist-plugin](https://github.com/delashum/obsidian-checklist-plugin).
Hats off the author of the previous plugin!

# Better Checklist

This plugin allows you to create task filters so you can group your tasks across
your vault into checklists.

<video src="https://github.com/user-attachments/assets/a43292e0-29c5-45bb-8e65-3e0eb288c567"></video>

## Features
- Create multiple checklist filters
- Filter checklists by selecting which pages should match and find tasks from
- Temporarily deactivate some checklist filters in the settings
- Grouping your tasks by having top level tags
  This plugin assumes that you organize your tasks into specific tags.

## Configuration

Each checklist filter has the following properties:

| Checklist Filter Property | Description |
| -- | -- |
| Include files | Filters which pages are used to find tasks from. This uses [Dataview pages query](https://blacksmithgu.github.io/obsidian-dataview/#data-querying)|
| Tag name | This is a line-separated tag filters. You can: <br /><ul><li>Leave it empty to match all tags.</li><li>Enumerate specific tags that you want to include in your checklist. </li><li>Add negative matches to remove these tags from matched checklist filter</li></ul>|
| Limit todos | You can control how many tasks you can view at a time. |
| Group by | Organizes your checklist either by file or by tags |

## Contributing

PRs are welcome! If you like this plugin, you can also support me here: 

<a href='https://ko-fi.com/V7V3166L2K' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
