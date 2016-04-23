sounds.load( [
  '/sounds/pop1.mp3',
  '/sounds/pop2.mp3',
  '/sounds/snare.mp3'
] );

sounds.whenLoaded = console.log.bind( console, 'sounds loaded' );

window.playSound = function( name ) {
	var sound = sounds[ '/sounds/' + name + '.mp3' ];

	if( !sound ) return console.warn( 'sound ' + name + '.mp3 not found or loaded' );

	sound.play();
};
