var isWriting;

Template[ 'need-detail' ].events( {
  'keyup input[name=message]': function( event ) {
    if( !isWriting && event.keyCode !== 13 && event.target.value ) {
      isWriting = true;
      Meteor.call( 'startTyping', this.need()._id );
      return;
    }

    if( isWriting && !event.target.value ) {
      isWriting = false;
      Meteor.call( 'stopTyping', this.need()._id );
      return;
    }

    if( event.keyCode !== 13 ) return;

    var value = event.target.value;
    if( !value ) return;
    event.target.value = '';
    Meteor.call( 'stopsTyping' );
    Meteor.call( 'addChatMessage', value, this.need()._id );
  }
} );

Template[ 'chat' ].helpers( {
	whose: function() {
		return this.createdBy === Meteor.userId() ? ' mine' : '';
	}
} );
