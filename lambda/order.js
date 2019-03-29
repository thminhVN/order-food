import qs from 'querystring';
const { WebClient } = require('@slack/client');

const splitter = ',';
const maxCountPerPerson = 8;

const getNewText = (origin, user, isAdd = true) => {
  const [dish, usersStr] = origin.split('\n');
  const users = usersStr ? usersStr.split(splitter) : [];
  if (isAdd) {
    if (users.find(i => i === `<@${user.id}>`)) {
      return (
        dish + '\n' + users.filter(i => i !== `<@${user.id}>`).join(splitter)
      );
    }
    return dish + '\n' + users.concat(`<@${user.id}>`).join(splitter);
  }
  return dish + '\n' + users.filter(i => i !== `<@${user.id}>`).join(splitter);
};

const countUser = usersStr => {
  const users = listUser(usersStr);
  return users.length;
};

const listUser = usersStr => {
  return usersStr ? usersStr.split(splitter) : [];
};

const randomUsers = (users, total) => {
  const totalRandom = Math.ceil(total / maxCountPerPerson);
  const arrayNumber = new Array(totalRandom);
  return arrayNumber.reduce((acc, item) => {
    const restUsers = users.filter(i => !acc.includes(i));
    const user = restUsers[Math.floor(Math.random() * restUsers.length)];
    return acc.concat([user]);
  }, []);
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
    const payload = JSON.parse(req.payload);
    const {
      actions,
      user,
      message: { blocks, ts },
      channel,
    } = payload;
    const { value, block_id } = actions[0];

    if (value === 'summary') {
      const currentTime = new Date().toLocaleString('vi-VN', {
        timeZone: 'Asia/Saigon',
      });
      const newBlocks = blocks
        .map(i => {
          if (typeof i.accessory !== 'undefined') {
            const [dish, usersStr] = i.text.text.split('\n');
            const userLength = countUser(usersStr);
            if (!userLength) return null;
            return {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${dish}: ${userLength}`,
              },
            };
          }
          return null;
        })
        .filter(i => i);

      const total = newBlocks
        .map(i => {
          const userLength = i.text.text.split(': ')[1];
          return parseInt(userLength);
        })
        .reduce((acc, value) => acc + value);

      const users = blocks
        .map(i => {
          if (typeof i.accessory !== 'undefined') {
            const usersStr = i.text.text.split('\n')[1];
            return listUser(usersStr);
          }
        })
        .reduce((acc, value) => acc.concat(value), [])
        .filter(i => i);

      const getter = randomUsers(users, total).join(', ');
      web.chat
        .postMessage({
          channel: channel.id,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Order summary at ${currentTime}`,
              },
            },
            {
              type: 'divider',
            },
            ...newBlocks,
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `TỔNG CỘNG: ${total}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Người lấy cơm: ${getter}`,
              },
            },
          ],
        })
        .then(rsp => {
          return respond({ status: 200, body: '' });
        });
      return true;
    }

    const newBlocks = blocks.map(i => {
      if (block_id === i.block_id) {
        const text = getNewText(i.text.text, user, true);
        return {
          ...i,
          text: {
            ...i.text,
            text,
          },
        };
      } else if (typeof i.accessory !== 'undefined') {
        const text = getNewText(i.text.text, user, false);
        return {
          ...i,
          text: {
            ...i.text,
            text,
          },
        };
      }
      return i;
    });
    web.chat
      .update({
        channel: channel.id,
        ts,
        blocks: newBlocks,
      })
      .then(rsp => {
        return respond({ status: 200, body: '' });
      });
  } catch (error) {
    console.log(error);
    respond({ status: 400, body: { error } });
  }
};
