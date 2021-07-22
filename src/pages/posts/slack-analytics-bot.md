---
posttype: post
date: 2021-07-14
author: A Person of Note
title: Beyond "Hello, World" Slackbots — Basic Data Analytics in Slack
published: true
coverImage: ../../images/self-portrait-photo.jpg
components: ""
tags: [javascript, bolt, slack, slack development, design, development, node.js]
---

I am in the process of making a Slack Bot that allows users to run a whole suite of data analytics, and figured it could be a fun way to expand past the simple "bot that says hello when you say its name" tutorials.

For this walkthrough I'm assuming some familiarity with development in general. Enough know what I mean when I say to import something, and enough to follow the [first app setup guide](https://api.slack.com/start/building/bolt-python) for Slack Bolt, have an app set up, and be looking around at what you can do beyond sending funny messages.

I've chosen to use Python for this app, but the instructions should translate easily to your language of choice. If you aren't using Slack Bolt you might have to extrapolate a little bit more with the commands; Bolt has a lot of handy wrappers.

For non-distributed apps and prototyping, I like to use Websocket mode. To enable that, just go to your app, go to the "websocket" section and toggle the toggle. Then you can import the built-in SocketModeHandler

    from slack_bolt.adapter.socket_mode import SocketModeHandler

and pass it your app and app-level token to start the app

    if __name__ == "__main__":
        try:
            SocketModeHandler(app, SLACK_APP_TOKEN).start()
        except SlackApiError as e:
            print(f'Slack api error: {e}')

If you plan on distributing your app to Slack at large or multiple workspaces, you'll have to set up response URLS (and ngrok for local testing) and probably OAuth too, but these are beyond today's scope, although some of the official walkthroughs do go over ngrok and tunelling a little bit.

## The Concept

Slack does have some built-in analytics. For example, admins can export spreadsheets with columns like "last channel activity." But it's not really accessible or transparent, and it doesn't cover my needs. The intent is for anyone to be able to go select a help channel and be able to get information about that channel's messages for a given timeframe. I'm just going to go over date constraints and displaying the number of total questions, the percentage of answered questions, and finding the top answerer, which will hopefully get the creative gears turning in your head for Slackbot development.

## The Design

A common convention for help channels is that when someone asks a question, whoever goes to answer it will react with an :eyes: reaction before engaging with the user for more information. Then, when the issue is resolved, the question is marked with a checkmark reaction. Highly recommend suggesting this pattern if your workspace doesn't already use it.

This app will open a modal that will allow users to select a help channel and a timeframe, then DM the user stats along with a spreadsheet of the same stats so they can download it or do whatever with it.

Originally, I designed the app to lean on slash commands and ephemeral chats, but ultimately scrapped that design in favor of modals and DMs. In a future iteration, I may do away with the shortcut and have the user message the bot as an entrypoint, but for now the shortcut flow works fine.

## Design Weaknesses and Slack Limitations

This approach isn't great for super hardcore analytics. For example, Slack does not include timestamps on reactions, so there's no solid way to tell exactly when reactions happened. I actually find this to be a good thing, in that I was concerned that putting a spotlight on "time to chekmark" would lead to a lot of unnecessary stress and incentivize people to only take easy questions to improve their time score. But the downside is that it's really hard to get a laser-accurate guage. To get an estimate of the average time to *address* a question, which I think is a much better metric, one could use the timestamp of the first threaded reply.

There's also a few human problems:

* Users often type multiple messages instead of one multiline message, which drags down the number of answered questions by quite a bit. 
    * This can be solved going forward by directing people to always put an :x: reaction on extraneous messages, but that doesn't fix the past.
* Admins can forget to mark longer-term questions as complete
* Admins may address a question with :eyes: and ask for further information but the user never responds, leaving a tagged but unanswered question out there.

I may try to address some of this later by putting a time limit on threads. This could look something like... if there is a thread, and the last response is NOT by the user who made the main post, mark it as complete (or maybe abandoned) after a certain amount of time. I plan to write a followup post about detail work like this, but won't deal with it for now.

## Getting the User Inputs

I'm using good old pandas for this one, as well as datetime. You could probably use just the plain csv module if you wanted, honestly. One of the original specs required writing multiple tabs in a csv file, and pandas has a nice built-in Excel functionality that allows for this, but that spec was scrapped so I may not even need pandas anymore.

One you have your basic slack app up and running, and have imported pandas (if you're using it) and datetime, go into your app's settings and make a modal.
First, I created a shortcut that launches a modal. If I had all the time in the world I'd probably make a custom selector component with only channels that start with the word "help." But I don't, so I settled for a text explanation that you can only do this on channels that have "help" in the name.

The basic way to set up a modal is outlined pretty well in the documentation. You can use the [Slack Block Kit Builder](https://app.slack.com/block-kit-builder) to quickly generate json that you can then slot into the blocks sections of your messages and modals.

I like to keep my modals and messages in a separate views file that I then import. That makes my modal action look something like:

    @app.shortcut('analyze_help_channel')
    def open_analyze_help_modal(ack, body, client):
        # You must always acknowledge the request in 3 seconds (so don't put the ack() after something that will take more than 3 seconds to succeed or fail!)
        ack()
        # Call views_open with the built-in client
        client.views_open(
            # Pass the trigger_id from the response body within 3 seconds of receiving it, same as the ack()
            trigger_id=body["trigger_id"],
            # View payload
            view=views.analyze_help_modal
        )


And the modal itself looks like:

    analyze_help_modal = {
        "type": "modal",
        # View identifier
        "callback_id": "analyze_help_modal",
        "title": {"type": "plain_text", "text": "Analyze a Channel"},
        "submit": {"type": "plain_text", "text": "Submit"},
            
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "Get stats on a help channel"
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "section",
                "text": {
                    "type": "plain_text",
                    "text": "Select the help channel you want to analyze ('help' channels have the word 'help' as a prefix)",
                    "emoji": True
                }
            },
            {
                "type": "actions",
                "block_id": "analyze_modal_channel_select",
                "elements": [
                    {
                        "type": "channels_select",
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Select channel",
                            "emoji": True
                        },
                        "action_id": "select_channel"
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "plain_text",
                    "text": "Pick a start and end date (optional)",
                    "emoji": True
                }
            },
            {
                "type": "actions",
                "block_id": "analyze_modal_dates_selection",
                "elements": [
                    {
                        "type": "datepicker",
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Select a date",
                            "emoji": True
                        },
                        "action_id": "start_date"
                    },
                    {
                        "type": "datepicker",
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Select a date",
                            "emoji": True
                        },
                        "action_id": "end_date"
                    }
                ]
            }
        ]
    }

For an explanation of triggers and so on, check out the docs on [creating modals](https://api.slack.com/surfaces/modals/using). (I assume you already have the python Slack Bolt documentation open, right? ...Right?)

Note that I've given a better name to the "action_id" field. If you're building from scratch, don't forget to include that field. If you're copying from the documentation or block kit builder, you'll have an id like "block_abc" or something.

*Also note that I've added a "block_id" field.* THIS IS IMPORTANT. If you don't do this, you won't be able to drill down to handle the action id, because Slack will assign a unique block id for you. Which is workable if you're immediately setting up on a persistent server, but if you're stopping and restarting the server for development, Slack will assign a new id every time. So make sure to add ids to your blocks! This is not obvious from the documentation, or at least it wasn't to me!

Once you've done that, you can access the value of the elements with the 'state' attribute, which looks roughly like:

    selected_channel_id = view['state']['values']['analyze_modal_channel_select']['select_channel']['selected_channel']

*Side note, when writing Slack apps, you're going to be doing a lot of payload inspection. For example, to get the user id from the response body of a modal submission, you'll need to find the body['user']['id'] attribute, while to find the user id for a message you'll need the body['user_id'] attribute. That's just how it is.*

You'll also need to call ack() for every element that a user can click on.

    @app.action("select_channel")
    def select_channel(ack):
        ack()

    @app.action("start_date")
    def start_date(ack):
        ack()

    @app.action("end_date")
    def end_date(ack):
        ack()

Otherwise you will get an unhandled interaction exception. But for this project you're not doing anything with the values until the modal is submitted, so you'll just call ack() and leave it at that.

You handle the overall view submission using the @app.view decorator. You'll pass your modal's callback_id, and handle it from there. I like to give the variable, callback_id, and handler functions basically the same name to keep everything straight, and would recommend you do the same, but, live your life.

My submission handler looks something like:

    @app.view('analyze_help_modal')
    def handle_analyze_help_modal(ack, body, client, view):
        ack()
        user_id = body['user']['id']
        start_date = view['state']['values']['analyze_modal_dates_selection']['start_date']['selected_date']
        end_date = view['state']['values']['analyze_modal_dates_selection']['end_date']['selected_date']
        client.chat_postMessage(
            channel = user_id,
            text = "Placeholder"
        )

So what's happening here? We're parsing out the form values using those long attribute chains, and then messaging the user who launched the modal. Note that DMing a user is the same as posting any chat, you just put their user id in the "channel" argument.


We still have a little bit to do before we can start using the conversations.history api to analyze our channel, and that's converting the dates into timestamps.

You can do this easily with the following snippet:

    time.mktime(datetime.strptime(input_time, "%Y-%m-%d").timetuple())

This isn't as gnarly as it looks. Your datepicker input will return a string in the format "year-month-day." (Yes, in the display on the modal, it looks like day-month-year. Why? ...¯\\_(ツ)_/¯) To get the timestamp, you first convert it to a datetime object.

    datetime.strptime(input_time, "%Y-%m-%d")

This function takes in an input string and an argument about how to format it. In another application, you might have day/month/year because 'Murica, so your second argument would look like "%d/%m/%Y". 

_Side note, check out [the docs](https://docs.python.org/3/library/datetime.html#strftime-and-strptime-behavior) for a full list of formats. There's a LOT you can do to wrangle human-readable dates._

Next, you want to convert your datetime to a timestamp. But the mktime() function takes in a time tuple, which contains the date and also a flag about daylight savings time. So first you convert your datetime to a time tuple

    datetime.strptime(input_time, "%Y-%m-%d").timetuple()

And finally you plug that whole thing into the mktime method.

    time.mktime(datetime.strptime(input_time, "%Y-%m-%d").timetuple())

_Side note, if you're reading this, I'm fairly new to writing code tutorials and I'm not totally confident about hitting the right level of explanation for intermediate coding. Like whether it's worth going over making timestamps to this depth or not, that kind of thing. If you're reading this and have feedback, please leave a comment, that would help me quite a bit! Thank you!_

Once we've converted our date inputs into timestamps, we're ready to start fetching conversation history!

## Getting the data to analyze

Now let's step through the [conversation history](https://api.slack.com/methods/conversations.history).

The very simplest version would just be:

    convo_res = app.client.conversations_history(
        channel=channel,
        oldest=start_date,
        latest=end_date
    )

But if you have a lot of messages, you'll need to paginate them. I've set it up for testing so that the logger prints out errors to a textfile. For deployment, I would add a message to the user when something goes wrong instead of just logging the error. If you want to get fancy you can also ping a dedicated app error channel to alert devs that something's gone wrong.


    def get_channel_history(channel, start_date=0, end_date=datetime.now(), limit=100000):
        try:
            convo_res = app.client.conversations_history(
                channel=channel,
                oldest=start_date,
                latest=end_date
            )
            if convo_res['ok']:
                messages = convo_res['messages']
                if convo_res['has_more']:
                    cursor = convo_res['response_metadata']['next_cursor']
                    while len(cursor) > 0:
                        try:
                            convo_res = app.client.conversations_history(
                                channel=channel,
                                cursor=cursor,
                                oldest=start_date,
                                latest=end_date,
                                limit=limit
                            )
                            logging.debug(
                                f'Slack API Error while using cursor: {e}\n' +
                                'Pausing for 5 seconds'
                            )
                            time.sleep(5)
                            continue
                        except urllib.error.URLError as e:
                            print(
                                f'Connection error during history loop: {e}\n' +
                                'Pausing for 30 seconds'
                            )
                            time.sleep(30)
                            continue
                        if convo_res['ok']:
                            messages.extend(convo_res['messages'])
                            if convo_res['has_more']:
                                cursor = convo_res['response_metadata']['next_cursor']
                            else:
                                cursor = ''
            else:
                return False
        except SlackApiError as e:
            logging.error(f'Slack API Error: {e}')
            return False
        except urllib.error.URLError as e:
            logging.error(
                f'Connection error during get channel history: {e}'
            )
            return False
        return messages

To untangle that a little bit: the conversations.history method is fetching a huge blob of JSON that has attributes like `has_more` and `cursor.` First, we attempt to call the method to see if it will work at all. If it gives a 200 `ok` response, then we can move forward and start doing things with that response. Namely, grab the data from the `messages` attribute and assign it to the variable `messages`. 

Next, we check for the `has_more` attribute. If there isn't one, we return `messages` and move on with our lives. If there is one, then we get the `next_cursor` value out of `response_metadata` and assign it to the variable `cursor.` 

Then, for as long as `cursor` isn't an empty string, we use `cursor` (which is a unique identifier, NOT an iterable) to keep getting `messages` and adding them to the `messages` variable. As soon as `has_more` == False, we set `cursor` to an empty string and break out of the loop.

The arguments constrain the conversations.history method. As a default we'll put in 0 and the current date to get the entirety of the channel history. We'll also put in a default limit of 100000 because we might want to use this method to get exactly one message later, which you can do by using a timestamp for the start and end, and a limit of 1. (This functionality is not covered in this tutorial so feel free to leave it out)

Now we can tell our app to call get_channel_history when the user submits the modal, pass it the timestamps and the channel name, and get back the history in the timeframe that the user asked for!

    @app.view('analyze_help_modal')
    def handle_analyze_help_modal(ack, body, client, view):
        ack()
        user_id = body['user']['id']
        text = "Stats"
        selected_channel_id = view['state']['values']['analyze_modal_channel_select']['select_channel']['selected_channel']
        info = client.conversations_info(channel=selected_channel_id)
        selected_channel_name = info['channel']['name']
        creation_date = info['channel']['created']
        if ("help" in selected_channel_name):
            if view['state']['values']['analyze_modal_dates_selection']['start_date']['selected_date'] :
                start_date = view['state']['values']['analyze_modal_dates_selection']['start_date']['selected_date']
                oldest = make_timestamp(start_date)
            else:
                oldest = creation_date
            if view['state']['values']['analyze_modal_dates_selection']['end_date']['selected_date']:
                end_date = view['state']['values']['analyze_modal_dates_selection']['end_date']['selected_date']
                latest = make_timestamp(end_date)
            else: 
                latest = datetime.now()
            if (oldest > latest):
                client.chat_postMessage(
                channel = user,
                user = user,
                text = "The start date must be earlier than the end date")
            else:
                history = get_channel_history(channel, oldest, latest)
        else:
            client.chat_postMessage(
                channel = user,
                user = user,
                text = "Please select a help-* channel to analyze"
            )

Ok you may have seen that I snuck a few extra things in there. 

First, I added an if statement to check for the word "help" in the channel name. This will be useful later, because we're trying to analyze a channel that uses reactions to track things. If we try to analyze a regular channel, the results won't make any sense. If it's not a help channel, the app messages the user to try a different channel.

Second, I made the default history a little nicer and set it to the beginning of the channel instead of all time, using that conversations.info call, and grabbing the `creation_date` from the response. It's just a lot faster that way. I also got the channel name from the same call and assigned it to selected_channel_name; we'll use that later to make the informational message nice. It's not really necessary, but since we're making the info call already, I figure why not?

Ok we've got our channel history, and we've allowed the user to fetch it themselves. But as you've probably noticed, it doesn't actually do anything right now. Next up, we're going to do a little bit of very rudimentary data analysis.

Let's make a function called `get_channel_stats` and pass it `history`.

    def get_help_stats(history):
        checkmarks = ["heavy_check_mark", "white_check_mark", "checkmarx", "greencheck3", "heavy_check_mark"]
        users = {}
        eyes = 0
        checks = 0
        unanswered = 0
        total_messages = 0 
        for h in history:
            # "Subtype" indicates channel_join/leave messages, etc, and should not be counted towards the total
            if "subtype" not in h.keys():
                eyes_time = 0
                check_time = 0
                total_messages += 1
                if 'reactions' in h.keys():
                    for x in h['reactions']:
                        user_id = x['users'][0] # This is assuming that only the first person to "eyes" something counts
                        if (user_id not in users):
                            users[user_id] = {"eyes": 0, "checks": 0}
                        user = users[user_id]
                        if x['name'] == "eyes":
                            eyes += x['count']
                            user['eyes'] += 1
                        # People use more than one type of checkmark
                        elif x['name'] in checkmarks:
                            checks += x['count']
                            user['checks'] += 1
                else:
                    unanswered += 1
           if (len(users.keys()) > 0):
                most_answers = max(users[user]['checks'] for user in users)
            else:
                most_answers = "There are no answered questions"
            num_leaders = []
            for user in users:
                user_checks = users[user]['checks']
                if user_checks == most_answers:
                    user_name = get_user_info(user)
                    num_leaders.append(user_name)
        # Create object to populate excel file
        stats = {"eyes": eyes, "checks": checks, "unanswered": unanswered, "total": total_messages, "num_leaders": num_leaders, "most_answers": most_answers}
        df = pd.DataFrame(stats, index=[0])
        # Make csv filepath
        now = datetime.now()
        timestamp = datetime.timestamp(now)
        file_path = f"./assets/vis-{channel}-{timestamp}.xlsx"
        writer = pd.ExcelWriter(file_path)
        # Convert the dataframe to an XlsxWriter Excel object.
        df.to_excel(writer, sheet_name='Total Stats')
        # Close the Pandas Excel writer and output the Excel file.
        writer.save()
        return file_path, stats 

Another one that looks a little bit long and complicated but is actually super easy. We just look at each message that doesn't have an attribute `subtype` (which tells us that it's a `channel_join` or similar event, not a message from a user), add +1 to the total questions, and look for reactions. If there's an :eyes: or check reaction (checked against an array of possible checkmarks because people don't always use the same ones), we add +1 to the relevant total for the user who added the reaction. If that user doesn't exist, we create a new user in the users dictionary. We also add +1 to the relevant total number of eyes and checks for the channel.

At the end, we use max() to find the top number of checkmarks, and add everyone with that many checks to a top scorers list. You could do this for a few leaderboard scores if you wanted, like "most questions addressed" with eyes.

Finally, we take all of that data and put it together into a stats dictionary. We convert that to a pandas dataframe with the `pd.DataFrame(stats, index[0])` line. I decided to name my files with the channel and timestamp, so we get the current timestamp, and then construct a file_path variable with that and the channel. Then we make our writer, convert the dataframe to an excel object and pass the writer, save the writer, and return the newly created filepath. We also return the stats object that we made so that we can use it in the next step. If you go and look in your assets folder, you'll see the file you just created.

So now we go back to our handler, get the stats that we just returned, and pass it to a view function.

    download_link = stats[0]
    client.chat_postMessage(
        channel = user_id,
        text = text,
        blocks = views.stats_message_download(stats[1], download_link, selected_channel_name, oldest, latest),
    )

In the views file, that translates to:

    def stats_message_download(stats, link, selected_channel_id, start_date=0, end_date="now"):
        if (start_date == 0):
            oldest = "The beginning of the channel"
        else:
            oldest = datetime.fromtimestamp(start_date)
        if (type(end_date) == str):
            newest = datetime.now()	
        else:
            newest = datetime.fromtimestamp(end_date)
        percent_resolved = (stats['checks'] / stats['total'] * 100)
        leader_list = ",".join(stats['num_leaders'])
        linking_verb_phrase = make_linking_verb(stats['num_leaders'])
        num_leader_string = f"The most frequent question {linking_verb_phrase} {leader_list}"
        return [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"From {oldest} to {newest}, the {selected_channel_id} channel has had {stats['eyes']} eyes, {stats['checks']} checkmarks, and {stats['unanswered']} unanswered questions out of {stats['total']} total top-level posts. This is a {percent_resolved}% resolution rate."
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": num_leader_string
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Get the full stats as an Excel Spreadsheet*"
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Get Stats",
                            "emoji": True
                        },
                        "value": link,
                        "action_id": "download_stats_file"
                    }
                ]
            }
        ]

Most of the function is just handling Slack idiosyncrasies and constructing a nice message for the user. For example, the default value for conversations.history if there's no ending time is "now," and if there's no beginning time is "0." Which we handled by making everything into timestamps, but it's still weird.

We put all of the stats together into a short summary sentence (including calculating the percentage of answered versus unaddressed questions).

We also format our leader list to say "the leaders are" versus "the leader is" when there's more than one versus one high scorer. It's a small thing, but a good detail to include.

The last thing we do here is attach that download link we made to the message, so the user can download their CSV! Note that of course this means the file will be on your server, so you may want to periodically clean that out via a cron job or something similar. If you do that, make sure to include a note warning the user that the files will be deleted after x amount of time.

If you put it all together, you should have a nice bot that analyzes help-style channels and makes a nice Excel file for people to see stats! This project is endlessly extensible, but I hope this is a good inspiration point.

--------
Useful links:
[Set up your first bot in Slack Bolt](https://api.slack.com/start/building/bolt-python)
[Shortcut Payload Reference Guide ](https://api.slack.com/reference/interaction-payloads/shortcuts)