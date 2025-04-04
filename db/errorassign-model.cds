namespace errorassign.db;
using { cuid, managed } from '@sap/cds/common';

entity ErrorAssignment: cuid, managed{
    errorcode: String @mandatory;
    plant: String;
    description: String @mandatory;
    department: String @mandatory;
    emailId: String ;
}

entity MasterConfig: cuid, managed{
    plant: String @mandatory;
    department: String @mandatory;
    email: String @mandatory;
}


