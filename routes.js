Router.route( '/', function(){ this.render( 'root' ); } );
Router.route( '/needs' );
Router.route( '/profile' );
Router.route( '/needs/:id', showNeed );


function beforeUnLoad( event ) {
	Meteor.call( 'leaveChat', this.params.id );
}

function showNeed() {
  var id = this.params.id;
  Meteor.call( 'joinChat', id );

  window.onbeforeunload = beforeUnLoad.bind( this );

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
}
