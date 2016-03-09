var chatWindows = {},
    chatWidth = 300,
    chatHeight = 400;

Template.needs.events( {
  "keyup input[name=need]": function( event ) {
    if( event.keyCode !== 13 ) return;
    var value = event.target.value, split, description;
    if( !value ) return;
    event.target.value = '';
console.log( value );
    Meteor.call( 'addNeed', value );
  }
} );

Template.needs.helpers( {
  needs: function() {
    return Needs.find( { snapshot: { $exists: false } }, { sort: { created: -1 } } );
  }
} );

Template.need.events( {
  'click button.delete': function( event ) {
    Meteor.call( 'deleteNeed', this._id );
  },
  'click a.open-chat': function( event ) {
    event.preventDefault();

    var windowName = this.title;

    chatWindows[ windowName ] = window.open( event.target.href, windowName, 'height=' + chatHeight + ',width=' + chatWidth );
    return false;
  }
} );
