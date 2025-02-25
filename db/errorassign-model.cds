namespace errorassign.db;
using { cuid, managed } from '@sap/cds/common';

entity ErrorAssignment: cuid, managed{
    username: String;
    errorcode: String;
    description: String;
    department: String;
    emailId: String;
}


