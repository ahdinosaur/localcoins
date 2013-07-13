# localcoins

### EXPERIMENTAL

## how to install

### npm (node package manager)
``` bash
curl http://npmjs.org/install.sh | sh
```

### localcoins

this type of installation is not ready, use development instructions below.

``` bash
[sudo] npm install localcoins
```

## how to develop

```bash
# localcoins requires development fork of 'resources' module
git clone git@github.com:ahdinosaur/resources.git -b master
cd resources
npm install
sudo npm link
cd ../

# localcoins requires development fork of 'resource' module
git clone git@github.com:ahdinosaur/resource.git -b master
cd resource
# include the 'resources' module we linked
npm link resources
npm install
sudo npm link
cd ../

# now we are ready to get localcoins

git clone https://github.com/ahdinosaur/localcoins
cd localcoins
node index.js
```

## how to use

```bash
% node index.js
info: resources
info:  - ads 
info:  - escrows 
help: type a resource name to explore it
info: commands
info:  - ads
info:  - ads all
info:  - ads update
info:  - escrows
info:  - escrows all
info:  - escrows release
help: type a command to execute it
 % node index.js ads all
info: showing all ads
prompt: localbitcoins.com username:  ahdinosaur-dev
prompt: localbitcoins.com password:  
data: {
  "data": {
    "ad_list": [
      {
        "data": {
          "city": "Berkeley",
          "trade_type": "LOCAL_SELL",
          "location_string": "Berkeley, CA, USA",
          "countrycode": "US",
          "currency": "USD",
          "lon": -122.27,
          "max_amount": null,
          "reference_type": "LONG",
          "min_amount": null,
          "sms_verification_required": false,
          "visible": true,
          "online_provider": "NATIONAL_BANK",
          "volume_coefficient_btc": "1.50",
          "lat": 37.87,
          "account_info": "",
          "age_days_coefficient_limit": "4.00",
          "price_equation": "mtgoxusd*11",
          "email": null,
          "first_time_limit_btc": null
        },
        "actions": {
          "html_form": "https://localbitcoins.com/ads_edit/21482",
          "public_view": "https://localbitcoins.com/ad/21482",
          "change_form": "https://localbitcoins.com/api/ad/21482/"
        }
      }
    ],
    "ad_count": 1
  }
}
```