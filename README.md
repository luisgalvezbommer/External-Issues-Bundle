# Kimai Plugin External Issues Bundle + Custom Content javascript for Issue Autocomplete in Timesheet Description

![Demo(demo.png)](./demo.png)

## Required Kimai Plugins

[Kimai Custom Content](https://www.kimai.org/store/custom-content-bundle.html)

## Target Audience
Users of Kimai and an issue tracking system (e.g., GitLab, YouTrack, etc.)

## Project Goal
As a Kimai user, I want to be able to use issue URLs from my issue tracking system via autocomplete in the description of a timesheet to better document my working hours.

The fields (key and value) to be displayed in autocomplete are defined in the .env file. When a user selects a key value in autocomplete, the issue URL is added to the timesheet description.

## What the Plugin Does
The plugin sends a GET request to the external issue tracking system, depending on the configurations or queryUrl set in a .env file.

The received issues are then made available on request via the Kimai endpoint api/description/issues.

Additionally, you can further filter the issues using a query string (in the Kimai URL, this would be, for example, `api/description/issues?search=abc`).

The query string is derived from the text entered by the user in the timesheet description text field.

## What the JavaScript does in the frontend
The JavaScript code in the frontend makes a fetch request to the endpoint `api/description/issues` described above, using the query string, when the user types in the description text field.

Additionally, some caching is performed between the frontend and the plugin.

## Integrating the plugin and the `.env` file into Kimai

Remove the version part -v1.0.0 .zip from ExternalIssuesBundle-v1.0.0

Unzip the content of ExternalIssuesBundle.zip into the `var/plugins` folder of your Kimai installation.

### Recommended in compose yaml

This plugin needs an .env file, so the recommended way is to integrate everything in the docker-compose file 

With Bind mounts:
```yaml
services:
...
kimai:
    image: kimai/kimai2:apache-2.42.0
    volumes:
      - ./CustomContentBundle:/opt/kimai/var/plugins/CustomContentBundle
      - ./ExternalIssuesBundle:/opt/kimai/var/plugins/ExternalIssuesBundle
    ports:
      - 8001:8001
    env_file:
      - /path/to/your/.env
    environment:
      - ADMINMAIL=admin@kimai.local
      - ADMINPASS=changemeplease
      - "DATABASE_URL=mysql://kimaiuser:kimaipassword@sqldb/kimai?charset=utf8mb4&serverVersion=8.3.0"
    restart: unless-stopped
```

You can also integrate the plugins with a Dockerfile:
```Dockerfile
FROM kimai/kimai2:apache-2.42.0

COPY ./CustomContentBundle /opt/kimai/var/plugins/CustomContentBundle
COPY ./ExternalIssuesBundle /opt/kimai/var/plugins/ExternalIssuesBundle

RUN chown -R www-data:www-data /opt/kimai/var/plugins
```

and then
```yaml
services:
...
kimai:
    build: .
    ...
```

## .env file example for youtrack

```dotenv
EXTERNAL_ISSUES_BASE_URL='https://youtrack.example.com'
EXTERNAL_ISSUES_ACCESS_TOKEN='perm-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

EXTERNAL_ISSUES_REQUEST_HEADERS_TEMPLATE='{"Authorization":"Bearer {EXTERNAL_ISSUES_ACCESS_TOKEN}","Accept":"application/json"}'

EXTERNAL_ISSUES_RESULT_KEY='idReadable'
EXTERNAL_ISSUES_RESULT_VALUE='summary'
EXTERNAL_ISSUE_IDENTIFIER='idReadable'
EXTERNAL_ISSUE_URL_TEMPLATE='{EXTERNAL_ISSUES_BASE_URL}issues/{EXTERNAL_ISSUE_IDENTIFIER}'

EXTERNAL_ISSUES_QUERY_URL_TEMPLATE='{EXTERNAL_ISSUES_BASE_URL}api/issues?fields={EXTERNAL_ISSUES_RESULT_KEY},{EXTERNAL_ISSUES_RESULT_VALUE},{EXTERNAL_ISSUE_IDENTIFIER},customFields(name,value(login))&query=Assignee:{KIMAI_USERNAME}%20AND%20{queryString}'
```

All placeholders in {} will be replaced internally with the corresponding value (Templates).
Here KIMAI_USERNAME is a special placeholder that will be replaced with the currently logged in kimai user name.
And queryString is the string that the user types in the description field.


For more examples, see [.env.youtrack](./.env.youtrack), [.env.gitlab](./.env.gitlab), [.env.github](./.env.github) in this repository.

## Usage 

1. Check endpoint /api/external/issues is working and returning issues from your issue tracker

2. Use the `customContent.js` for CustomContent js  

