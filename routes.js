Router.route( '/', function(){
  this.render( 'root' );
} );

Router.route( '/needs' );

Router.route( '/needs/:id', function() {
  var id = this.params.id;
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
