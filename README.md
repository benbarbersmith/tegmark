# Tegmark
A webapp to render and interact with worlds generated by
[Everett](https://github.com/samcorcoran/everett).


## Frontend

Built with Angular, Bootstrap and d3. You'll need to acquire the necessary
libraries before deploying -- use Bower for fun and profit. Instructions:

1. `git clone https://github.com/benjaminasmith/tegmark.git`
2. `bower install`
3. `cp ./bower_components/angular/angular.js www/js/`
4. `cp ./bower_components/angular-resource/angular-resource.min.js www/js/`
5. `cp ./bower_components/angular-route/angular-route.min.js www/js/`
6. `cp ./bower_components/bootstrap/dist/js/bootstrap.min.js www/js/`
7. `cp ./bower_components/jquery/dist/jquery.min.js www/js/`
8. `cp ./bower_components/d3/d3.min.js www/js/`
9. `cp ./bower_components/topojson/topojson.js www/js/`
10. `cp ./bower_components/bootstrap/dist/css/bootstrap.min.css www/css/`
11. `cp ./bower_components/bootstrap/dist/fonts/* www/fonts/`

The frontend will use the URL defined at the top of `www/app.js` as the base for
requests to the backend.

`var serverUrl = "http://localhost:15000`

Edit it as appropriate.

Once done, deploy the `www/` directory to your favourite hosting platform.
Alternatively, use Python to host it locally:

`cd www; python -mSimpleHTTPServer`


## Backend

Built with Flask. Instructions:

1. `pip install -r requirements.txt`
2. `python worldserver.py`
3. `python webserver.py`

## Example

![Progress after first weekend](http://i.imgur.com/ggQsPx5.png)

![Progress after a full week](http://imgur.com/KuSoZip.png)
