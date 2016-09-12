// http://meteortips.com/second-meteor-tutorial/validation/
// themeteorchef:jquery-validation

Template.login.events({
    'submit .login-form': function (event) {

        event.preventDefault();

    }
});

Template.login.onRendered(function(){
    var validator = $('.login-form').validate({
        rules: {
            username: {
                required: true,
                minlength: 3
            },
            password: {
                required: true,
                minlength: 6
            }
        },
        messages: {
            username: {
                required: "You must enter a username.",
                minlength: "Username must be at least {0} characters."                
            },
            password: {
                required: "You must enter a password."            }
        },
        submitHandler: function(event){
            var username = $('[name=username]').val();
            var password = $('[name=password]').val();
            
            Meteor.loginWithPassword(
                username,
                password,
                function(error){
                    if(error){
                        console.log("user_login.js - validate.submitHandler - error:" + error.reason);
                        
                        if(error.reason == "User not found"){
                            validator.showErrors({username: error.reason});
                            }
                        if(error.reason == "Incorrect password"){
                            validator.showErrors({password: error.reason});
                            }
                    } else {
                        Router.go("/needs");
                    }
                }
            );
        }    

    });
});

