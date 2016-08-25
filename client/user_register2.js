// http://meteortips.com/second-meteor-tutorial/validation/
// themeteorchef:jquery-validation

Template.register2.events({
    'submit .register2-form': function (event) {

        event.preventDefault();

    }
});

Template.register2.onRendered(function(){

    var validator = $('.register2-form').validate({
        rules: {
            /* 2016-08-25 removed email field by edits request
            email: {
                required: false,
                email: true
            }
            */
        },
        messages: {},
        submitHandler: function(event){
            Router.go("/needs");
        }
    });
});

