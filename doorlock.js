#!/usr/bin/env node

// UPDATE:
// (1). This work is derived from
// Smartphone Connected Home Door Lock by Hacker Shack. The original
// writeup can be found at https://www.hackster.io/hackershack/smartphone-connected-home-door-lock-69944f
// and https://hackaday.io/project/19478-smartphone-connected-home-door-lock
//
// (2). Added code to control a two-wire 400N linear actuator

//*** SMARTPHONE DOORLOCK ***//

// ************* PARAMETERS *************** //
// 
// Parameters: unlockedState and lockedState
// These parameters are in microseconds.
// The servo pulse determines the degree 
// at which the horn is positioned. In our
// case, we get about 100 degrees of rotation
// from 1ms-2.2ms pulse width. You will need
// to play with these settings to get it to
// work properly with your door lock
//
// Parameters: motorPin
// The GPIO pin the signal wire on your servo
// is connected to
//
// Parameters: buttonPin
// The GPIO pin the signal wire on your button
// is connected to. It is okay to have no button connected
//
// Parameters: ledPin
// The GPIO pin the signal wire on your led
// is connected to. It is okay to have no ledconnected
//
// Parameter: blynkToken
// The token which was generated for your blynk
// project
//
// **************************************** //


var unlockedState = 1000;
var lockedState = 2200;

var motorPin = 14;
var buttonPin = 4;
var ledPin = 17;
var extendLinearActuatorPin = 18;
var retractLinearActuatorPin = 27;

var blynk_Token = require('./token.js');
var blynkToken = blynk_Token.blynk_token;

const delay = require('delay');

// *** Start code *** //

var locked = true;

//Setup servo
var Gpio = require('pigpio').Gpio,
  motor = new Gpio(motorPin, {mode: Gpio.OUTPUT}),
  button = new Gpio(buttonPin, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_DOWN,
    edge: Gpio.FALLING_EDGE
  }),
  led = new Gpio(ledPin, {mode: Gpio.OUTPUT}),
  extendActuator = new Gpio(extendLinearActuatorPin, {mode: Gpio.OUTPUT}),
  retractActuator = new Gpio(retractLinearActuatorPin, {mode: Gpio.OUTPUT});

//Setup blynk
var Blynk = require('blynk-library');
//var blynk = new Blynk.Blynk(blynkToken);
var AUTH = blynkToken;
//var blynk = new Blynk.Blynk(AUTH, options= {addr:"192.168.254.135", port:9443});

/* The next line enables this script to connect to the local blynk server on the RaspberryPi */
var blynk = new Blynk.Blynk(AUTH, options = { connector : new Blynk.TcpClient( options = { addr:"127.0.0.1", port:8080 } ) });


var v0 = new blynk.VirtualPin(0);

console.log("locking door")
lockDoor()

button.on('interrupt', function (level) {
	console.log("level: " + level + " locked: " + locked)
	if (level == 0) {
		if (locked) {
			unlockDoor()
		} else {
			lockDoor()
		}
	}
});

v0.on('write', function(param) {
	console.log('V0:', param);
  	if (param[0] === '0') { //unlocked
  		unlockDoor()
  	} else if (param[0] === '1') { //locked
  		lockDoor()
  	} else {
  		blynk.notify("Door lock button was pressed with unknown parameter");
  	}
});

blynk.on('connect', function() { console.log("Blynk ready."); });
blynk.on('disconnect', function() { console.log("DISCONNECT"); });

function lockDoor() {
	motor.servoWrite(lockedState);
	led.digitalWrite(1);
	locked = true;

	//notify
  	blynk.notify("Door has been locked!");
  	
  	//After 1.5 seconds, the door lock servo turns off to avoid stall current
	setTimeout(function(){motor.servoWrite(0)}, 1500);
	(async () => {
		await delay(2000);
		retractActuator.digitalWrite(0);
		extendActuator.digitalWrite(1);
	})();
}

function unlockDoor() {
	motor.servoWrite(unlockedState);
	led.digitalWrite(0);
	locked = false;

	//notify
  	blynk.notify("Door has been unlocked!"); 

  	//After 1.5 seconds, the door lock servo turns off to avoid stall current
	setTimeout(function(){motor.servoWrite(0)}, 1500);
	(async () => {
		await delay(2000);
		extendActuator.digitalWrite(0);
		retractActuator.digitalWrite(1);
	})();
}
