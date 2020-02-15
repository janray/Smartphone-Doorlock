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
var sleep = require('sleep');

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
  retractActuator = new Gpio(retractLinearActuatorPin, {mode: Gpio.OUTPUT})

//Setup blynk
var Blynk = require('blynk-library');
//var blynk = new Blynk.Blynk(blynkToken);
var AUTH = blynkToken;

/* The next line enables this script to connect to the local blynk server on the RaspberryPi */
var blynk = new Blynk.Blynk(AUTH, options = { connector : new Blynk.TcpClient( options = { addr:"127.0.0.1", port:8080 } ) });


var v0 = new blynk.VirtualPin(0);

console.log("locking door");

(async () => {
	lockDoor();
	await delay(19000);
	motor.servoWrite(lockedState);
	blynk.notify("Door has been locked!");
	//After 1.5 seconds, the door lock servo turns off to avoid stall current
	setTimeout(function(){motor.servoWrite(0)}, 1500);
})();


button.on('interrupt', (level) => {
	console.log("level: " + level + " locked: " + locked)
	if (level == 0) {
		if (locked) {
			//unlockDoor()
			motor.servoWrite(unlockedState);
			//After 1.5 seconds, the door lock servo turns off to avoid stall current
			setTimeout(function(){motor.servoWrite(0)}, 1500);
			(async () => {
				
				await delay(900);
				unlockDoor();
			})();
		} else {
			//lockDoor()
			 if (locked === true) {
				motor.servoWrite(0);
			 }else { 
				 	lockDoor();
					(async () => {
							await delay(19000);
							motor.servoWrite(lockedState);
							//After 1.5 seconds, the door lock servo turns off to avoid stall current
							setTimeout(function(){motor.servoWrite(0)}, 1500);
							blynk.notify("Door has been locked!");
					})();
				}
			
		}
	}
});


v0.on('write', function(param) {
	console.log('V0:', param);
	  if (param[0] === '0') { //unlocked
		(async () => {
			motor.servoWrite(unlockedState);
			//After 1.5 seconds, the door lock servo turns off to avoid stall current
			setTimeout(function(){motor.servoWrite(0)}, 1500);
			await delay(900);
			unlockDoor();
		})();
  	} else if (param[0] === '1') { //locked
		  if (locked === true) {
			  motor.servoWrite(0);
		  } else {
				(async () => {
						lockDoor();
						await delay(19000);
						motor.servoWrite(lockedState);
						//After 1.5 seconds, the door lock servo turns off to avoid stall current
						setTimeout(function(){motor.servoWrite(0)}, 1500);
						blynk.notify("Door has been locked!");
				})();
		  }
  	} else {
  		blynk.notify("Door lock button was pressed with unknown parameter");
  	}
});

blynk.on('connect', function() { console.log("Blynk ready."); });
blynk.on('disconnect', function() { console.log("DISCONNECT"); });

// CLOSE
function lockDoor() {
	
	led.digitalWrite(1);
	locked = true;

	extendActuator.digitalWrite(1);
	retractActuator.digitalWrite(0);
	
}

// OPEN
function unlockDoor() {

	led.digitalWrite(0);
	locked = false;

	extendActuator.digitalWrite(0);
	retractActuator.digitalWrite(1);

	//notify
  	blynk.notify("Door has been unlocked!"); 

  	

}
