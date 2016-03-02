var chatWindows = {},
    chatWidth = 200,
    chatHeight = 300;

Template.needs.events( {
  "keyup input[name=need]": function( event ) {
    if( event.keyCode !== 13 ) return;
    var value = event.target.value, split, description;
    if( !value ) return;
    event.target.value = '';
    if( ( split = value.split( '-' ) ).length > 1 ) {
      value = split[ 0 ];
      description = split[ 1 ];
    }

    Meteor.call( 'addNeed', { title: value, description: description } );
  }
} );

Template.needs.helpers( {
  needs: function() {
    return Needs.find( {}, { sort: { created: -1 } } );
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
