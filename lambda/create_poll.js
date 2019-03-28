import qs from 'querystring';
import splitLines from 'split-lines';

const { WebClient } = require('@slack/client');

const reducer = (accumulator, currentValue) => {
  return accumulator.concat([
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: currentValue,
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          emoji: true,
          text: 'Order',
        },
        value: currentValue,
      },
    },
  ]);
};

exports.handler = (event, context, callback) => {
  // check if env var exist
  if (!process.env.SLACK_TOKEN) {
    callback(new Error('missing SLACK_WEBHOOK_TOKEN'));
    return;
  }

  const respond = ({ status = 200, body = '' }) => {
    callback(null, {
      statusCode: status,
      body: body || '',
    });
  };

  const web = new WebClient(process.env.SLACK_TOKEN);

  try {
    const req = qs.parse(event.body);
    const { text, channel_id } = req;
    const menus = text.replace(/(\r\n|\n|\r)/gm, '|').split('|');

    const title = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Please select item in this menu?*',
        },
      },
      {
        type: 'divider',
      },
    ];

    const blocks = menus.reduce(reducer, title).concat([
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Show summary',
              emoji: true,
            },
            value: 'summary',
          },
        ],
      },
    ]);

    web.chat
      .postMessage({
        channel: channel_id,
        blocks,
      })
      .then(rsp => {
        return respond({ status: 200, body: '' });
      })
      .catch(err => {
        console.log(err);
      });
  } catch (error) {
    console.log(error);
    respond({ status: 400, body: { error } });
  }
};
