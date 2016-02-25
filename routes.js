Router.route( '/', function(){
  this.render( 'root' );
} );

Router.route( '/needs' );

var needId;

Router.route( '/needs/:id', function() {
  var id = needId = this.params.id;
  Meteor.call( 'joinChat', id );

  window.onbeforeunload = beforeUnLoad;

  this.render( 'need-detail', {
    data: {
      need: function() {
        return Needs.findOne( { _id: id } );
      },
      chatmessages: function() {
          return ChatMessages.find( { sourceId: id } );
      }
    }
  } );
} );

Router.route( '/profile' );

function beforeUnLoad( event ) {
	Meteor.call( 'leaveChat', needId );
}
