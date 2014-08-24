/**
 * Interface to display customer account transactions.
 * 
 * */
(function(obj){

    //NODE [IF BROWSER MUST SELF-DEFINE]
    if(typeof process === 'object' && process + '' === '[object process]'){
        module.exports = (Orgy.export(obj) || obj);
    }
    else{
        Orgy.export(obj);
    }
    
}(function(){
    var cls = {

        ///////////////////////////////////////////////////
        //  VARIABLES
        ///////////////////////////////////////////////////
        __dependencies : [

        ]
      
        ////////////////////////////////////////
        //  CONSTRUCTOR/RESOLVER
        ////////////////////////////////////////
        ,__resolver : function(r,deferred){
            var scope = this;
            deferred.resolve(this);
            return;
            
            /*
            var selector = "div[name='"+this.__id+"'] div.inner";

            this.fetch(function(r){
                
                //DISPLAY VIEW
                scope.display(selector,r);

                //SIGNAL IS COMPLETE
                deferred.resolve(scope);

            },scope.default_search);
            */
        }
        ,data : null

        ////////////////////////////////////////////////////////////////////////
        //  PUBLIC METHODS
        ////////////////////////////////////////////////////////////////////////
        ,fetch : function(__callback,__params){ 

            //ALLOW FOR SERVER TO EMBED DATA TO AVOID AN RPC

            if(this.data !== null){
                __callback.call(this,this.data);
            }
            else{
                var ajaxOptions = {
                    data:{
                        route:'/modules/account/transactions/api/_auth_fetch_transactions',
                        params:[__params]
                    },
                    cache:false,
                    callback:__callback,
                    caller_scope:this
                };
                Orgy.list['core.rpc'].value.queue(ajaxOptions);
            }
        }

        ,display : function(selector,r){

            // INITIALIZING THE DATAGRID
            /*
            var dataSource = new Orgy.list['core.fueluxDataObject'].value({
                columns: r.columns,
                data: r.values,
                delay: 1
            });

            $(selector + ' div.ui table').datagrid({
                dataSource: dataSource,
                stretchHeight: true
            });
            */
           
            //SET ACCOUNTS OBJECT IN DROPDOWN
            var accts_obj = {
                'ALL' : ''
            };
            
            for(var i in r.accounts){
                accts_obj[r.accounts[i]] = r.accounts[i];
            }
           
            //SET TRANSACTIONS TABLE ID
            var tableid = "transactions-table";
           
            var _html = Orgy.list['core.dataToTable'].value.render(r,{
                id : tableid
                ,dropdown_filter : {
                    title : "Account:"
                    ,options : accts_obj
                }
                //CHOOSE WHAT COLUMNS TO HIDE FOR RESPONSIVE
                ,thead : {
                    
                }
            });
            
            
            $(selector).append(_html);
            $("#" + tableid).footable().bind({
                footable_filtering: function (e) {
                    var selected = $('.filter-status').find(':selected').val();
                    if (selected && selected.length > 0) {
                        e.filter += (e.filter && e.filter.length > 0) ? ' ' + selected : selected;
                        e.clear = !e.filter;
                    }
                },
                footable_filtered: function() {
                    var count = $("#" + tableid +' tbody tr:not(.footable-filtered)').length;
                    $('.row-count').html(count + ' rows found');
                }
            });
            
            $(selector).find('.filter-status').change(function (e) {
                e.preventDefault();
                $("#" + tableid).data('footable-filter').filter("");
            });
        }
    };
    
    return cls;
}()));