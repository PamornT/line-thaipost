const REGION = 'asia-east2';
const functions = require('firebase-functions');
const request = require('request-promise');

const config = require('./config.json');
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer '+ config.line.channelAccessToken
};

exports.ThaiPostTrackBot = functions.region(REGION).https.onRequest((req, res) => {
    if (req.body.events[0].message.type == 'text') {
        // Example: ED852942182TH
        let message = req.body.events[0].message.text;
        gettrack(req, message);

    } else {
        reply(req);
    }

    async function gettrack(req, message)
    {
        let promise_token = new Promise(resolve => {
            var options = {
                method: 'POST',
                uri: 'https://trackapi.thailandpost.co.th/post/api/v1/authenticate/token',
                strictSSL: false,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Token ' + config.thaipost.token
                }
            };
            
            request(options, function(error, response, body) {
                resolve(JSON.parse(body));
            });
        });
        
        let access_token = await promise_token;
        let params = {
            "status": "all",
            "language": "TH",
            "barcode": [
                message
           ]
        };
        let promise_track = new Promise(resolve => {
            var options = {
                method: 'POST',
                uri: 'https://trackapi.thailandpost.co.th/post/api/v1/track',
                strictSSL: false,
                body: JSON.stringify(params),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Token ' + access_token.token
                }
            };
            
            request(options, function(error, response, body) {
                resolve( JSON.parse(body) );
            });
        });

        let tracks = await promise_track;
        
        let item_json = [];
        let { response } = tracks;
        let { items } = response;
        let key = Object.keys(tracks.response.items);
        
        if (items[key[0]].length > 0) {
            let bgcolor;
            items[key[0]].forEach(function(detail) {
                bgcolor = (detail.delivery_status == 'S') ? '#ABEBC6' : '#EEEEEE';
                const item_temp = {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                {
                                    "type": "text",
                                    "text": detail.status_date
                                }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {
                                        "type": "spacer",
                                        "size": "xxl"
                                    },
                                    {
                                        "type": "text",
                                        "text": detail.status_description,
                                        "size": "sm"
                                    }
                                ],
                                "spacing": "none",
                                "margin": "md"
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {
                                        "type": "spacer",
                                        "size": "xxl"
                                    },
                                    {
                                        "type": "text",
                                        "text": detail.location,
                                        "size": "sm"
                                    },
                                    {
                                        "type": "text",
                                        "text": detail.postcode,
                                        "size": "sm"
                                    }
                                ],
                                "spacing": "none",
                                "margin": "md"
                            }
                        ]
                    }
                    ],
                    "backgroundColor": bgcolor,
                    "cornerRadius": "md",
                    "paddingAll": "10px"
                };

                item_json.push(item_temp);
            
            });


            payload = {
                "type": "bubble",
                "size": "giga",
                "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                    "type": "text",
                    "text": key[0],
                    "decoration": "none",
                    "size": "xl",
                    "weight": "bold"
                    },
                    {
                    "type": "box",
                    "layout": "vertical",
                    "contents": item_json,
                    "spacing": "sm",
                    "margin": "md"
                    }
                ]
                }
            }
            reply_track(req, payload);    
        } else {
            reply_notfound(req);
        }
    }
});

const reply_track = (req, payload) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    "type": "flex",
                    "altText": "สถานะการส่งของ",
                    "contents": {
                        "type": "carousel",
                        "contents": [payload]
                    } 
                }
            ]
        })
    });
};

const reply_notfound = (req) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    type: `text`,
                    text: 'ไม่พบหมายเลขพัสดุที่ระบุ'
                }
            ]
        })
    });
};

const reply = (req) => {
    return request({
        method: `POST`,
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
                {
                    type: `text`,
                    text: JSON.stringify(req.body)
                }
            ]
        })
    });
};