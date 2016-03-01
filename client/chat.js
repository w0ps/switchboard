Template[ 'need-detail' ].events( {
  'keyup input[name=message]': function( event ) {
    if( event.keyCode !== 13 ) return;
    var value = event.target.value;
    if( !value ) return;
    event.target.value = '';
    Meteor.call( 'addChatMessage', value, this.need()._id );
  }
} );

Template[ 'chat' ].helpers( {
	whose: function() {
		return this.createdBy === Meteor.userId() ? ' mine' : '';
	}
} );
